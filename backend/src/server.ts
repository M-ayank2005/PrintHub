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
    mongoose.set('autoIndex', config.env === 'development');
    await mongoose.connect(config.mongoUri, {
      autoIndex: config.env === 'development',
    });
    logger.info('MongoDB Atlas connected successfully');

    // 2. Initialize Express app and HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.io Gateway
    initSocketGateway(server);
    logger.info('Real-time Socket.io gateway initialized (single instance)');

    // 4. Start background Purge Sweeper
    const sweeperInterval = purgeService.startSweeper(60 * 1000);

    // 5. Start listening on 0.0.0.0 for containerized deployment (Render)
    server.listen(config.port, '0.0.0.0', () => {
      logger.info({ port: config.port, env: config.env }, 'PrintHub Backend API listening on 0.0.0.0');
    });

    // 6. Comprehensive graceful shutdown handler
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info({ signal }, 'Graceful shutdown initiated: closing connections...');

      clearInterval(sweeperInterval);

      const forceExitTimer = setTimeout(() => {
        logger.warn('Forced shutdown timeout reached. Terminating process.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      try {
        const { closeSocketGateway } = await import('./realtime/gateway');
        await closeSocketGateway();
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
        await mongoose.disconnect();
        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
      }
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
