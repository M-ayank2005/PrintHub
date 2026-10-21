import { Router, Response } from 'express';
import { requireBusinessAuth, AuthenticatedBusinessRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { jobService } from '../services/job.service';
import { AgentJobStatusUpdateSchema } from '@printhub/shared';

const router = Router();

router.use(requireBusinessAuth);

/**
 * Endpoint called by the desktop agent to fetch short-lived presigned download URLs.
 * Valid only when the job is ACCEPTED, QUEUED, or PRINTING.
 */
router.post(
  '/jobs/:id/download-urls',
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const result = await jobService.getAgentDownloadUrls(req.params.id, req.businessId!, req.deviceId);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }
);

/**
 * Endpoint called by the desktop agent to report printing progress and completion.
 */
router.post(
  '/jobs/:id/status',
  validateBody(AgentJobStatusUpdateSchema),
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const { status, reason } = req.body;
      const job = await jobService.transitionStatus(
        req.params.id,
        ['ACCEPTED', 'QUEUED', 'PRINTING', 'FAILED_PRINT'],
        status,
        reason
      );
      res.json({ job });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
