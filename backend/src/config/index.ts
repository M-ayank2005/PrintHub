import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/printhub',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'printhub_super_secret_access_key_change_in_prod_123!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'printhub_super_secret_refresh_key_change_in_prod_456!',
    sessionSecret: process.env.JWT_SESSION_SECRET || 'printhub_super_secret_session_key_change_in_prod_789!',
    accessTtlSec: 15 * 60, // 15 mins
    refreshTtlSec: 30 * 24 * 60 * 60, // 30 days
    sessionTtlSec: 30 * 60, // 30 mins
  },
  cors: {
    allowedOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,tauri://localhost').split(','),
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 's3',
    localUploadDir: path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR || 'uploads'),
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-005',
      bucket: process.env.S3_BUCKET || 'printhub-temp',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
  },
};
