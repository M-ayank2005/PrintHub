import { Router, Response } from 'express';
import { requireBusinessAuth, AuthenticatedBusinessRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { businessService } from '../services/business.service';
import { jobService } from '../services/job.service';
import { printerService } from '../services/printer.service';
import { JobModel } from '../models/job.model';
import {
  BusinessProfileUpdateSchema,
  BusinessPricingSchema,
  AgentRegisterSchema,
} from '@printhub/shared';

const router = Router();

// All business routes require business auth
router.use(requireBusinessAuth);

router.get('/system-printers', async (_req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
  try {
    const printers = await printerService.getSystemPrinters();
    res.json({ printers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
  try {
    const business = await businessService.getProfile(req.businessId!);
    res.json({ business });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.put(
  '/me',
  validateBody(BusinessProfileUpdateSchema),
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const business = await businessService.updateProfile(req.businessId!, req.body);
      res.json({ business });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.put(
  '/me/pricing',
  validateBody(BusinessPricingSchema),
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const business = await businessService.updatePricing(req.businessId!, req.body);
      res.json({ business });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/me/slug/rotate',
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const result = await businessService.rotateSlug(req.businessId!);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/agent/register',
  validateBody(AgentRegisterSchema),
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const result = await businessService.registerAgent(req.businessId!, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get('/jobs', async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
  try {
    const statusQuery = req.query.status as string | undefined;
    const filter: any = { businessId: req.businessId };

    if (statusQuery) {
      const statuses = statusQuery.split(',').map((s) => s.trim());
      filter.status = { $in: statuses };
    }

    const jobs = await JobModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-docs.storageKey -docs.versionId');

    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/jobs/:id/accept',
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const job = await jobService.acceptJob(req.params.id, req.businessId!);
      res.json({ job });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/jobs/:id/reject',
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const job = await jobService.rejectJob(req.params.id, req.businessId!, req.body.reason);
      res.json({ job });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/jobs/:id/retry',
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const job = await jobService.retryJob(req.params.id, req.businessId!);
      res.json({ job });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/jobs/:id/mark-paid',
  async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
    try {
      const job = await jobService.markPaid(req.params.id, req.businessId!);
      res.json({ job });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get('/stats', async (req: AuthenticatedBusinessRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt((req.query.days as string) || '7', 10);
    const stats = await businessService.getDashboardStats(req.businessId!, days);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
