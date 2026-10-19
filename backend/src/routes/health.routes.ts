import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/readyz', (_req: Request, res: Response) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  if (!isMongoReady) {
    res.status(503).json({ status: 'unready', database: 'disconnected' });
    return;
  }
  res.json({ status: 'ready', database: 'connected' });
});

export default router;
