import { Router, Request, Response } from 'express';
import { getStorageProvider, LocalDiskStorageProvider } from '../storage';

const router = Router();

router.put('/local/upload', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.query.key as string;
    const expires = parseInt(req.query.expires as string, 10);
    const token = req.query.token as string;

    if (!key || !expires || !token) {
      res.status(400).json({ error: 'Missing key, expires, or token parameter' });
      return;
    }

    const storage = getStorageProvider();
    if (storage instanceof LocalDiskStorageProvider) {
      const isValid = storage.verifyToken(key, expires, 'upload', token);
      if (!isValid) {
        res.status(403).json({ error: 'Invalid or expired upload token' });
        return;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await storage.saveObjectBytes(key, buffer);
          res.status(200).json({ success: true, sizeBytes: buffer.length });
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });
    } else {
      res.status(400).json({ error: 'Local storage provider not active' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/local/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.query.key as string;
    const expires = parseInt(req.query.expires as string, 10);
    const token = req.query.token as string;

    if (!key || !expires || !token) {
      res.status(400).json({ error: 'Missing key, expires, or token parameter' });
      return;
    }

    const storage = getStorageProvider();
    if (storage instanceof LocalDiskStorageProvider) {
      const isValid = storage.verifyToken(key, expires, 'download', token);
      if (!isValid) {
        res.status(403).json({ error: 'Invalid or expired download token' });
        return;
      }

      const bytes = await storage.getObjectBytes(key);
      res.setHeader('Content-Type', key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      res.setHeader('Content-Length', bytes.length);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.send(bytes);
    } else {
      res.status(400).json({ error: 'Local storage provider not active' });
    }
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
