import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger } from './logger';
import { errorHandler } from './middleware/error-handler';

import authRoutes from './routes/auth.routes';
import businessRoutes from './routes/business.routes';
import publicRoutes from './routes/public.routes';
import agentRoutes from './routes/agent.routes';
import storageRoutes from './routes/storage.routes';
import healthRoutes from './routes/health.routes';

export function createApp(): express.Application {
  const app = express();

  // Trust proxy for Render reverse proxy (to see real client IP for rate limiting and logging)
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl)
        if (!origin) return callback(null, true);

        // Always allow desktop Tauri schemes and local origin requests
        if (
          origin.startsWith('http://localhost') ||
          origin.startsWith('tauri://') ||
          origin.startsWith('http://tauri.localhost') ||
          origin.startsWith('https://tauri.localhost') ||
          origin.startsWith('asset://')
        ) {
          return callback(null, true);
        }

        // Production strictly enforces allowed origins for web requests
        if (config.cors.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token'],
    })
  );

  // Request logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/healthz' || req.url === '/readyz',
      },
    })
  );

  // Body parsers (JSON 100kb limit)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Global rate limiter
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use(limiter);

  // API Routes
  app.use('/auth', authRoutes);
  app.use('/business', businessRoutes);
  app.use('/public', publicRoutes);
  app.use('/agent', agentRoutes);
  app.use('/storage', storageRoutes);
  app.use('/', healthRoutes);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
