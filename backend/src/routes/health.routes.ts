import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { getStorageProvider } from '../storage';

const router = Router();

router.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/readyz', async (_req: Request, res: Response): Promise<void> => {
  const isMongoReady = mongoose.connection.readyState === 1;

  let isStorageReady = false;
  try {
    const storage = getStorageProvider();
    if (storage && typeof storage.checkHealth === 'function') {
      isStorageReady = await storage.checkHealth();
    } else {
      isStorageReady = Boolean(storage);
    }
  } catch {
    isStorageReady = false;
  }

  if (!isMongoReady || !isStorageReady) {
    res.status(503).json({
      status: 'unready',
      database: isMongoReady ? 'connected' : 'disconnected',
      storage: isStorageReady ? 'reachable' : 'unreachable',
    });
    return;
  }

  res.json({
    status: 'ready',
    database: 'connected',
    storage: 'reachable',
  });
});

export default router;
