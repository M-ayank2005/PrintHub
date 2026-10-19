import { Types } from 'mongoose';
import { JobModel, IJob } from '../models/job.model';
import { DailyStatsModel } from '../models/daily-stats.model';
import { getStorageProvider } from '../storage';
import { purgeService } from './purge.service';
import { emitJobUpdated } from '../realtime/gateway';
import { logger } from '../logger';
import { JobStatus, PaymentState, TERMINAL_JOB_STATUSES } from '@printhub/shared';

export class JobService {
  /**
   * Atomically transitions a job's status if its current status matches expected status.
   */
  async transitionStatus(
    jobId: string,
    expectedFrom: JobStatus | JobStatus[],
    toStatus: JobStatus,
    reason?: string
  ): Promise<IJob> {
    const fromArray = Array.isArray(expectedFrom) ? expectedFrom : [expectedFrom];

    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, status: { $in: fromArray } },
      {
        $set: {
          status: toStatus,
          ...(toStatus === 'PRINTED' && { printedAt: new Date() }),
        },
      },
      { new: true }
    );

    if (!job) {
      throw new Error(
        `Failed to transition job ${jobId} to ${toStatus}: current status is not in [${fromArray.join(', ')}]`
      );
    }

    emitJobUpdated(job.businessId.toString(), {
      jobId: job._id.toString(),
      status: job.status,
      paymentState: job.paymentState,
      reason,
      timestamp: new Date().toISOString(),
    });

    // If job transitioned to a terminal state, trigger immediate purge
    if (TERMINAL_JOB_STATUSES.includes(toStatus)) {
      purgeService.purgeJob(job._id.toString()).catch((err) => {
        logger.error({ err, jobId: job._id }, 'Error during terminal job purge');
      });
    }

    // Update daily stats on terminal states
    if (toStatus === 'PRINTED' || toStatus === 'REJECTED' || toStatus === 'EXPIRED') {
      this.recordDailyStats(job).catch((err) => {
        logger.error({ err, jobId: job._id }, 'Error recording daily stats');
      });
    }

    return job;
  }

  async acceptJob(jobId: string, businessId: string): Promise<IJob> {
    const job = await JobModel.findOne({ _id: jobId, businessId });
    if (!job) {
      throw new Error('Job not found.');
    }

    return await this.transitionStatus(jobId, 'SUBMITTED', 'ACCEPTED');
  }

  async rejectJob(jobId: string, businessId: string, reason?: string): Promise<IJob> {
    const job = await JobModel.findOne({ _id: jobId, businessId });
    if (!job) {
      throw new Error('Job not found.');
    }

    // Customer already paid via UPI should not be rejected without manual resolution
    if (job.paymentMode === 'UPI' && job.paymentState === 'PAID_CONFIRMED') {
      throw new Error('Cannot reject a job that has already been confirmed paid via UPI.');
    }

    return await this.transitionStatus(jobId, ['SUBMITTED', 'ACCEPTED', 'QUEUED'], 'REJECTED', reason);
  }

  async retryJob(jobId: string, businessId: string): Promise<IJob> {
    const job = await JobModel.findOne({ _id: jobId, businessId });
    if (!job) {
      throw new Error('Job not found.');
    }

    return await this.transitionStatus(jobId, 'FAILED_PRINT', 'QUEUED');
  }

  async markPaid(jobId: string, businessId: string): Promise<IJob> {
    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, businessId },
      { $set: { paymentState: 'PAID_CONFIRMED' } },
      { new: true }
    );

    if (!job) {
      throw new Error('Job not found.');
    }

    emitJobUpdated(businessId, {
      jobId: job._id.toString(),
      status: job.status,
      paymentState: job.paymentState,
      timestamp: new Date().toISOString(),
    });

    return job;
  }

  /**
   * Agent endpoint to retrieve short-lived (60s) download URLs for printing.
   */
  async getAgentDownloadUrls(
    jobId: string,
    businessId: string
  ): Promise<{
    jobId: string;
    code: string;
    docs: Array<{
      docId: string;
      kind: string;
      pages: number;
      options: any;
      downloadUrl: string;
    }>;
  }> {
    const job = await JobModel.findOne({
      _id: jobId,
      businessId,
      status: { $in: ['ACCEPTED', 'QUEUED', 'PRINTING'] },
    });

    if (!job) {
      throw new Error('Job is not in an accepted/printable state or does not belong to this business.');
    }

    // Automatically transition to PRINTING if not already
    if (job.status !== 'PRINTING') {
      await this.transitionStatus(jobId, ['ACCEPTED', 'QUEUED'], 'PRINTING');
    }

    const storage = getStorageProvider();
    const docsWithUrls = await Promise.all(
      job.docs.map(async (doc) => {
        if (!doc.storageKey) {
          throw new Error(`Document ${doc.docId} storage key has already been purged.`);
        }
        const downloadUrl = await storage.presignDownload(doc.storageKey, 60); // 60s valid
        return {
          docId: doc.docId,
          kind: doc.kind,
          pages: doc.pages,
          options: doc.options,
          downloadUrl,
        };
      })
    );

    return {
      jobId: job._id.toString(),
      code: job.code,
      docs: docsWithUrls,
    };
  }

  /**
   * Records completed job statistics to DailyStatsModel.
   */
  private async recordDailyStats(job: IJob): Promise<void> {
    const dateStr = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    const isConfirmed = job.paymentState === 'PAID_CONFIRMED';
    const revenueField = isConfirmed ? 'revenueConfirmedPaise' : 'revenuePendingPaise';

    const incUpdate: any = {
      jobs: 1,
      docs: job.totals.documents,
      pages: job.totals.pages,
      sheets: job.totals.sheets,
      bwSheets: job.totals.bwSheets,
      colorSheets: job.totals.colorSheets,
      [revenueField]: job.totals.pricePaise,
      [`hourly.${hour}`]: 1,
    };

    if (job.status === 'REJECTED') {
      incUpdate.rejected = 1;
    } else if (job.status === 'EXPIRED') {
      incUpdate.expired = 1;
    }

    await DailyStatsModel.updateOne(
      { businessId: job.businessId, date: dateStr },
      { $inc: incUpdate },
      { upsert: true }
    );
  }
}

export const jobService = new JobService();
