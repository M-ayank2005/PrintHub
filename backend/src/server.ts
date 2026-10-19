import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';
import { initSocketGateway } from './realtime/gateway';
import { purgeService } from './services/purge.service';

async function startServer(): Promise<void> {
  try {
    // 1. Connect to MongoDB
    if (!config.mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment. Please set MONGODB_URI in your .env file.');
    }
    const sanitizedUri = config.mongoUri.replace(/:([^:@]+)@/, ':****@');
    logger.info({ uri: sanitizedUri }, 'Connecting to MongoDB Atlas...');
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB Atlas connected successfully');

    // 2. Initialize Express app and HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.io Gateway
    initSocketGateway(server);
    logger.info('Real-time Socket.io gateway initialized');

    // 4. Start background Purge Sweeper
    const sweeperInterval = purgeService.startSweeper(60 * 1000);

    // 5. Start listening
    server.listen(config.port, () => {
      logger.info(`PrintHub Backend API running on http://localhost:${config.port}`);
    });

    // 6. Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Gracefully shutting down server...');
      clearInterval(sweeperInterval);
      server.close(async () => {
        await mongoose.disconnect();
        logger.info('Server closed cleanly');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.fatal({ err }, 'Fatal error during server startup');
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}
