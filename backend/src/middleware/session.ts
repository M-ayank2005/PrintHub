import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface CustomerSessionPayload {
  sessionId: string;
  businessId: string;
  slug: string;
}

export interface AuthenticatedCustomerRequest extends Request {
  customerSession?: CustomerSessionPayload;
}

export function requireCustomerSession(
  req: AuthenticatedCustomerRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['x-session-token'] || req.headers.authorization;
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : typeof authHeader === 'string'
    ? authHeader
    : undefined;

  if (!token) {
    res.status(401).json({ error: 'Missing customer session token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.sessionSecret) as CustomerSessionPayload;
    req.customerSession = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired customer session' });
  }
}
