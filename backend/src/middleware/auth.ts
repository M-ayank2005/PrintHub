import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthenticatedBusinessRequest extends Request {
  businessId?: string;
  deviceId?: string;
}

export function requireBusinessAuth(
  req: AuthenticatedBusinessRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as {
      businessId: string;
      deviceId?: string;
    };
    req.businessId = decoded.businessId;
    req.deviceId = decoded.deviceId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
}
