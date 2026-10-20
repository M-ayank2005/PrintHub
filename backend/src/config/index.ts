import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

// Strict environment variable validation using Zod
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: isProd
    ? z.string().min(1, 'MONGODB_URI is required in production')
    : z.string().default(''),
  JWT_ACCESS_SECRET: isProd
    ? z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters in production')
    : z.string().default(''),
  JWT_REFRESH_SECRET: isProd
    ? z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters in production')
    : z.string().default(''),
  JWT_SESSION_SECRET: isProd
    ? z.string().min(32, 'JWT_SESSION_SECRET (or JWT_CUSTOMER_SECRET) must be at least 32 characters in production')
    : z.string().default(''),
  CORS_ORIGINS: isProd
    ? z.string().min(1, 'CORS_ORIGINS is required in production')
    : z.string().default('http://localhost:3000,http://localhost:3001,tauri://localhost,http://tauri.localhost'),
  PUBLIC_API_URL: z.string().optional(),
  CUSTOMER_APP_URL: z.string().optional(),
  STORAGE_DRIVER: isProd
    ? z.enum(['local', 's3']).refine((val) => val !== 'local', {
        message: 'STORAGE_DRIVER=local is not allowed in production. You must set STORAGE_DRIVER=s3 with S3-compatible credentials (Backblaze B2, Cloudflare R2, or AWS S3).',
      })
    : z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-005'),
  S3_BUCKET: isProd
    ? z.string().min(1, 'S3_BUCKET is required in production when STORAGE_DRIVER=s3')
    : z.string().optional(),
  S3_ACCESS_KEY_ID: isProd
    ? z.string().min(1, 'S3_ACCESS_KEY_ID is required in production when STORAGE_DRIVER=s3')
    : z.string().optional(),
  S3_SECRET_ACCESS_KEY: isProd
    ? z.string().min(1, 'S3_SECRET_ACCESS_KEY is required in production when STORAGE_DRIVER=s3')
    : z.string().optional(),
  LOCAL_UPLOAD_DIR: z.string().default('uploads'),
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
});

const rawEnv = {
  ...process.env,
  JWT_SESSION_SECRET: process.env.JWT_SESSION_SECRET || process.env.JWT_CUSTOMER_SECRET || '',
};

const result = envSchema.safeParse(rawEnv);

if (!result.success) {
  console.error('\n❌ FATAL: Production environment configuration error:');
  for (const issue of result.error.issues) {
    console.error(`  - [${issue.path.join('.')}]: ${issue.message}`);
  }
  console.error('\nPlease supply all required environment variables with valid values.\n');
  if (isProd) {
    process.exit(1);
  }
}

const parsedEnv = result.success ? result.data : (rawEnv as any);

export const config = {
  env: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  publicApiUrl: parsedEnv.PUBLIC_API_URL || `http://localhost:${parsedEnv.PORT}`,
  customerAppUrl: parsedEnv.CUSTOMER_APP_URL || 'http://localhost:3000',
  mongoUri: parsedEnv.MONGODB_URI || '',
  jwt: {
    get accessSecret(): string {
      return (
        process.env.JWT_ACCESS_SECRET ||
        (process.env.NODE_ENV === 'test' ? 'test_jwt_access_secret_32_characters_long!' : '')
      );
    },
    get refreshSecret(): string {
      return (
        process.env.JWT_REFRESH_SECRET ||
        (process.env.NODE_ENV === 'test' ? 'test_jwt_refresh_secret_32_characters_long!' : '')
      );
    },
    get sessionSecret(): string {
      return (
        process.env.JWT_SESSION_SECRET ||
        process.env.JWT_CUSTOMER_SECRET ||
        (process.env.NODE_ENV === 'test' ? 'test_jwt_session_secret_32_characters_long!' : '')
      );
    },
    accessTtlSec: 15 * 60, // 15 mins
    refreshTtlSec: 30 * 24 * 60 * 60, // 30 days
    sessionTtlSec: 30 * 60, // 30 mins
  },
  cors: {
    allowedOrigins: (parsedEnv.CORS_ORIGINS || '')
      .split(',')
      .map((o: string) => o.trim())
      .filter(Boolean),
  },
  storage: {
    driver: parsedEnv.STORAGE_DRIVER as 'local' | 's3',
    localUploadDir: path.resolve(process.cwd(), parsedEnv.LOCAL_UPLOAD_DIR || 'uploads'),
    s3: {
      endpoint: parsedEnv.S3_ENDPOINT,
      region: parsedEnv.S3_REGION || 'us-east-005',
      bucket: parsedEnv.S3_BUCKET || '',
      accessKeyId: parsedEnv.S3_ACCESS_KEY_ID || '',
      secretAccessKey: parsedEnv.S3_SECRET_ACCESS_KEY || '',
    },
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: parsedEnv.RATE_LIMIT_MAX,
  },
};
