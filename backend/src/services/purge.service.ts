import { JobModel, IJob } from '../models/job.model';
import { getStorageProvider } from '../storage';
import { StorageProvider } from '../storage/storage.interface';
import { logger } from '../logger';
import { TERMINAL_JOB_STATUSES } from '@printhub/shared';
import { jobService } from './job.service';

function isNotFoundError(err: any): boolean {
  return (
    err?.name === 'NotFound' ||
    err?.name === 'NoSuchKey' ||
    err?.$metadata?.httpStatusCode === 404 ||
    err?.code === 'ENOENT' ||
    (typeof err?.message === 'string' && err.message.toLowerCase().includes('not found'))
  );
}

async function deleteAndVerifyObject(
  storage: StorageProvider,
  key: string,
  versionId?: string,
  maxRetries = 3
): Promise<void> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      await storage.deleteObject(key, versionId);

      // Verify deletion with headObject
      try {
        await storage.headObject(key);
        // If headObject succeeds without error, the object still exists
        throw new Error(`Object ${key} still exists after deleteObject`);
      } catch (headErr: any) {
        if (isNotFoundError(headErr)) {
          // Object confirmed deleted
          return;
        }
        throw headErr;
      }
    } catch (err: any) {
      if (attempt >= maxRetries) {
        throw err;
      }
      const delayMs = Math.min(500 * Math.pow(2, attempt - 1), 4000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export class PurgeService {
  /**
   * Immediately purges document files from storage and sanitizes database records.
   * Only marks purgedAt and unsets storage keys after every object delete is verified.
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
    let allDeleted = true;

    // 1. Delete each document file from object storage with retry and verification
    for (const doc of job.docs) {
      if (doc.storageKey) {
        try {
          await deleteAndVerifyObject(storage, doc.storageKey, doc.versionId);
          logger.info({ jobId, docId: doc.docId, storageKey: doc.storageKey }, 'Purged and verified document from storage');
        } catch (err) {
          allDeleted = false;
          logger.error({ err, jobId, storageKey: doc.storageKey }, 'Failed to delete or verify storage object during purge');
        }
      }
    }

    // 2. Clear storage keys from MongoDB and mark as purged ONLY after all deletions succeed
    if (allDeleted) {
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
    } else {
      logger.warn({ jobId }, 'Job purge incomplete; keeping storage keys for sweeper retry');
    }
  }

  /**
   * Background sweeper: scans for expired non-terminal jobs past TTL or unpurged terminal jobs.
   */
  async runSweeper(): Promise<void> {
    try {
      const now = new Date();

      // 1. Find unpurged terminal jobs
      const unpurgedTerminalJobs = await JobModel.find({
        status: { $in: TERMINAL_JOB_STATUSES },
        purgedAt: null,
      }).limit(50);

      for (const job of unpurgedTerminalJobs) {
        logger.info({ jobId: job._id, status: job.status }, 'Sweeper purging unpurged terminal job');
        await this.purgeJob(job._id.toString());
      }

      // 2. Find all non-terminal jobs past TTL and expire through transitionStatus
      const expiredJobs = await JobModel.find({
        status: { $nin: TERMINAL_JOB_STATUSES },
        expiresAt: { $lt: now },
      }).limit(50);

      for (const job of expiredJobs) {
        logger.info({ jobId: job._id, status: job.status }, 'Sweeper expiring non-terminal job past TTL');
        try {
          await jobService.transitionStatus(job._id.toString(), job.status, 'EXPIRED', 'Job expired past TTL');
        } catch (err) {
          logger.error({ err, jobId: job._id }, 'Failed to transition expired job in sweeper');
        }
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
