# PrintHub Operations Runbook

This runbook documents operational procedures, configuration references, and troubleshooting workflows for the QR Print Platform.

---

## 1. System Components & Architecture Overview

The system consists of:
1. **Backend API (`backend/`)**: Express + TypeScript + MongoDB + Socket.io gateway running on port `4000`.
2. **Customer Mobile Web PWA (`customer/`)**: Next.js App Router application running on port `3000`.
3. **Business Desktop App (`business/`)**: Tauri v2 desktop application running with static export on port `3001`.
4. **Shared Package (`packages/shared/`)**: Zod validation schemas, types, and deterministic pricing calculation engine.

---

## 2. Local Development & Quickstart

### Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x
- MongoDB (running locally or MongoDB Atlas)
- Rust toolchain (cargo, rustc) for compiling the Tauri desktop agent

### Setup Steps
```bash
# 1. Install all monorepo dependencies
pnpm install

# 2. Build the shared packages
pnpm --filter @printhub/shared build

# 3. Start Backend API
pnpm dev:backend

# 4. Start Customer Web App
pnpm dev:customer

# 5. Start Business Desktop App UI
pnpm dev:business
```

---

## 3. Environment Variables Reference

Create a `.env` file in `backend/`:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/printhub

# Security Secrets
JWT_ACCESS_SECRET=printhub_super_secret_access_key_change_in_prod_123!
JWT_REFRESH_SECRET=printhub_super_secret_refresh_key_change_in_prod_456!
JWT_SESSION_SECRET=printhub_super_secret_session_key_change_in_prod_789!

# Storage Provider (local or s3)
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=uploads

# S3 / Backblaze B2 Configuration (when STORAGE_DRIVER=s3)
S3_ENDPOINT=https://s3.us-east-005.backblazeb2.com
S3_REGION=us-east-005
S3_BUCKET=printhub-temp
S3_ACCESS_KEY_ID=your_b2_key_id
S3_SECRET_ACCESS_KEY=your_b2_application_key

# Rate Limiting
RATE_LIMIT_MAX=1000
```

---

## 4. Key Management & Rotation Procedures

### 4.1 Rotating JWT Secrets
1. Generate new 64-character random hex strings:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `JWT_SESSION_SECRET` in environment variables.
3. Restart the API server. Existing desktop sessions will prompt for re-authentication on their next refresh window (15 minutes).

### 4.2 Rotating Object Storage (B2 / S3) Keys
1. Create a new Application Key in the Backblaze B2 / AWS / Cloudflare R2 dashboard with restricted permissions to the specific bucket only.
2. Update `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`.
3. Restart the backend API.
4. Delete the retired key in the bucket provider console.

---

## 5. Deletion & Privacy Verification

Documents are guaranteed to be deleted within **30 seconds** of any terminal event (`PRINTED`, `REJECTED`, `EXPIRED`, `CANCELLED`).

To verify purge status:
```bash
# Run backend integration tests with disk verification
pnpm --filter @printhub/backend test
```

The sweeper worker executes automatically every 60 seconds to clean any abandoned or expired files.
