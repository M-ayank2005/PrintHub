import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { validateBody } from '../middleware/validate';
import { BusinessSignupSchema, BusinessLoginSchema, RefreshTokenSchema } from '@printhub/shared';

const router = Router();

router.post(
  '/signup',
  validateBody(BusinessSignupSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await authService.signup(req.body);
      res.status(201).json({
        business: {
          id: result.business._id,
          email: result.business.email,
          shopName: result.business.shopName,
          slug: result.business.slug,
          pricing: result.business.pricing,
          isOpen: result.business.isOpen,
          printBeforePayment: result.business.printBeforePayment,
        },
        tokens: result.tokens,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/login',
  validateBody(BusinessLoginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await authService.login(req.body);
      res.json({
        business: {
          id: result.business._id,
          email: result.business.email,
          shopName: result.business.shopName,
          slug: result.business.slug,
          upiId: result.business.upiId,
          payeeName: result.business.payeeName,
          pricing: result.business.pricing,
          isOpen: result.business.isOpen,
          acceptPaused: result.business.acceptPaused,
          printBeforePayment: result.business.printBeforePayment,
        },
        tokens: result.tokens,
      });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  }
);

router.post(
  '/refresh',
  validateBody(RefreshTokenSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      res.json({ tokens });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  }
);

router.post(
  '/logout',
  validateBody(RefreshTokenSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await authService.logout(req.body.refreshToken);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
