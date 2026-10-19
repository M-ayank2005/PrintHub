import { JobModel, IJob } from '../models/job.model';
import { getStorageProvider } from '../storage';
import { logger } from '../logger';
import { TERMINAL_JOB_STATUSES } from '@printhub/shared';

export class PurgeService {
  /**
   * Immediately purges document files from storage and sanitizes database records.
   */
  async purgeJob(jobId: string): Promise<void> {
    const job = await JobModel.findById(jobId);
    if (!job) {
      logger.warn({ jobId }, 'Cannot purge non-existent job');
      return;
    }

    if (job.purgedAt) {
      logger.info({ jobId }, 'Job is already purged');
      return;
    }

    const storage = getStorageProvider();

    // 1. Delete each document file from object storage
    for (const doc of job.docs) {
      if (doc.storageKey) {
        try {
          await storage.deleteObject(doc.storageKey, doc.versionId);
          logger.info({ jobId, docId: doc.docId, storageKey: doc.storageKey }, 'Purged document from storage');
        } catch (err) {
          logger.error({ err, jobId, storageKey: doc.storageKey }, 'Failed to delete storage object during purge');
        }
      }
    }

    // 2. Clear storage keys from MongoDB and mark as purged
    await JobModel.updateOne(
      { _id: jobId },
      {
        $set: {
          purgedAt: new Date(),
        },
        $unset: {
          'docs.$[].storageKey': 1,
          'docs.$[].versionId': 1,
        },
      }
    );

    logger.info({ jobId }, 'Job purge completed successfully');
  }

  /**
   * Background sweeper: scans for expired jobs or unpurged terminal jobs.
   */
  async runSweeper(): Promise<void> {
    try {
      const now = new Date();

      // Find unpurged terminal jobs
      const unpurgedTerminalJobs = await JobModel.find({
        status: { $in: TERMINAL_JOB_STATUSES },
        purgedAt: null,
      }).limit(50);

      for (const job of unpurgedTerminalJobs) {
        logger.info({ jobId: job._id, status: job.status }, 'Sweeper purging unpurged terminal job');
        await this.purgeJob(job._id.toString());
      }

      // Find jobs that expired waiting for shop acceptance
      const expiredJobs = await JobModel.find({
        status: 'SUBMITTED',
        expiresAt: { $lt: now },
      }).limit(50);

      for (const job of expiredJobs) {
        logger.info({ jobId: job._id }, 'Sweeper expiring and purging timed out job');
        job.status = 'EXPIRED';
        await job.save();
        await this.purgeJob(job._id.toString());
      }
    } catch (err) {
      logger.error({ err }, 'Error running purge sweeper');
    }
  }

  /**
   * Starts periodic background sweeper tasks.
   */
  startSweeper(intervalMs = 60 * 1000): NodeJS.Timeout {
    logger.info('Starting Purge Sweeper background task');
    return setInterval(() => {
      this.runSweeper().catch((err) => logger.error({ err }, 'Sweeper execution error'));
    }, intervalMs);
  }
}

export const purgeService = new PurgeService();
