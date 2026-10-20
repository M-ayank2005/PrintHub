import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../logger';
import { BusinessModel } from '../models/business.model';
import { JobModel } from '../models/job.model';
import { DailyStatsModel } from '../models/daily-stats.model';
import { RefreshTokenModel } from '../models/refresh-token.model';

async function createIndexes(): Promise<void> {
  if (!config.mongoUri) {
    console.error('❌ MONGODB_URI is required to create indexes');
    process.exit(1);
  }

  try {
    const sanitizedUri = config.mongoUri.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connecting to MongoDB Atlas at ${sanitizedUri}...`);
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    console.log('Syncing indexes for BusinessModel (unique slug, email)...');
    await BusinessModel.syncIndexes();

    console.log('Syncing indexes for JobModel ({status, expiresAt}, code, etc.)...');
    await JobModel.syncIndexes();

    console.log('Syncing indexes for DailyStatsModel (businessId, date)...');
    await DailyStatsModel.syncIndexes();

    console.log('Syncing indexes for RefreshTokenModel (token, expiresAt TTL)...');
    await RefreshTokenModel.syncIndexes();

    console.log('✅ All production database indexes created and synced successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create database indexes:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

createIndexes();
