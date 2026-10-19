import { Router, Request, Response } from 'express';
import { publicService } from '../services/public.service';
import { requireCustomerSession, AuthenticatedCustomerRequest } from '../middleware/session';
import { validateBody } from '../middleware/validate';
import {
  PublicSessionCreateSchema,
  UploadPresignRequestSchema,
  QuoteRequestSchema,
  JobSubmitSchema,
} from '@printhub/shared';
import { z } from 'zod';

const router = Router();

router.get('/shops/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const shop = await publicService.getShopBySlug(req.params.slug);
    res.json({ shop });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.post(
  '/sessions',
  validateBody(PublicSessionCreateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await publicService.createSession(req.body.slug);
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// The remaining public endpoints require the customer's signed session token
router.post(
  '/uploads/presign',
  requireCustomerSession,
  validateBody(UploadPresignRequestSchema),
  async (req: AuthenticatedCustomerRequest, res: Response): Promise<void> => {
    try {
      const result = await publicService.presignUpload(req.customerSession!, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

const UploadConfirmSchema = z.object({
  storageKey: z.string().min(1),
  kind: z.enum(['PDF', 'IMAGE', 'SCAN']),
});

router.post(
  '/uploads/confirm',
  requireCustomerSession,
  validateBody(UploadConfirmSchema),
  async (req: AuthenticatedCustomerRequest, res: Response): Promise<void> => {
    try {
      const result = await publicService.confirmUpload(req.body.storageKey, req.body.kind);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/quote',
  requireCustomerSession,
  validateBody(QuoteRequestSchema),
  async (req: AuthenticatedCustomerRequest, res: Response): Promise<void> => {
    try {
      const quote = await publicService.getQuote(req.customerSession!.businessId, req.body.docs);
      res.json(quote);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/jobs',
  requireCustomerSession,
  validateBody(JobSubmitSchema),
  async (req: AuthenticatedCustomerRequest, res: Response): Promise<void> => {
    try {
      const job = await publicService.submitJob(req.customerSession!, req.body);
      res.status(201).json({
        job: {
          id: job._id.toString(),
          code: job.code,
          status: job.status,
          customerName: job.customerName,
          paymentMode: job.paymentMode,
          paymentState: job.paymentState,
          totals: job.totals,
          expiresAt: job.expiresAt,
          createdAt: job.createdAt,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get(
  '/jobs/:id',
  requireCustomerSession,
  async (req: AuthenticatedCustomerRequest, res: Response): Promise<void> => {
    try {
      const job = await publicService.getJobStatus(req.params.id, req.customerSession!.sessionId);
      res.json({ job });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }
);

router.post(
  '/jobs/:id/cancel',
  requireCustomerSession,
  async (req: AuthenticatedCustomerRequest, res: Response): Promise<void> => {
    try {
      await publicService.cancelJob(req.params.id, req.customerSession!.sessionId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/jobs/:id/payment-claim',
  requireCustomerSession,
  async (req: AuthenticatedCustomerRequest, res: Response): Promise<void> => {
    try {
      await publicService.claimPayment(req.params.id, req.customerSession!.sessionId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
