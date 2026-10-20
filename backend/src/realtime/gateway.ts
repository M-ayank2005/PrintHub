import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../logger';
import { businessService } from '../services/business.service';
import { JobNewEvent, JobUpdatedEvent } from '@printhub/shared';

let io: SocketIOServer | null = null;

export function initSocketGateway(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (config.env !== 'production') {
          if (
            config.cors.allowedOrigins.includes(origin) ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('tauri://') ||
            origin.startsWith('http://tauri.localhost') ||
            origin.startsWith('https://tauri.localhost')
          ) {
            return callback(null, true);
          }
          return callback(null, true);
        }
        if (config.cors.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin not allowed by Socket.IO CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 20000,
    pingTimeout: 10000,
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as {
        businessId: string;
        deviceId?: string;
      };
      (socket as any).businessId = decoded.businessId;
      (socket as any).deviceId = decoded.deviceId;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const businessId = (socket as any).businessId as string;
    const deviceId = (socket as any).deviceId as string | undefined;

    const room = `business:${businessId}`;
    socket.join(room);
    logger.info({ businessId, deviceId, socketId: socket.id }, 'Desktop Agent connected to WebSocket');

    // Heartbeat from agent
    socket.on('agent.heartbeat', async (data: { deviceId?: string; printerCaps?: any }) => {
      const activeDeviceId = deviceId || data?.deviceId;
      if (activeDeviceId) {
        await businessService.updateHeartbeat(businessId, activeDeviceId, data?.printerCaps);
      }
    });

    socket.on('disconnect', () => {
      logger.info({ businessId, deviceId, socketId: socket.id }, 'Desktop Agent disconnected');
    });
  });

  return io;
}

export function emitJobNew(businessId: string, event: JobNewEvent): void {
  if (io) {
    io.to(`business:${businessId}`).emit('job.new', event);
    logger.info({ businessId, jobId: event.job.id, code: event.job.code }, 'Emitted job.new to agent');
  }
}

export function emitJobUpdated(businessId: string, event: JobUpdatedEvent): void {
  if (io) {
    io.to(`business:${businessId}`).emit('job.updated', event);
    logger.info({ businessId, jobId: event.jobId, status: event.status }, 'Emitted job.updated to agent');
  }
}

export function emitJobPurged(businessId: string, jobId: string): void {
  if (io) {
    io.to(`business:${businessId}`).emit('job.purged', { jobId, timestamp: new Date().toISOString() });
    logger.info({ businessId, jobId }, 'Emitted job.purged to agent');
  }
}

export async function closeSocketGateway(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => {
        io = null;
        resolve();
      });
    });
  }
}

