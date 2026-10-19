# Architectural and Design Decisions

This document records architectural, technical, and implementation decisions made during the development of QR Print Platform, in accordance with the project specification.

---

## 1. Monorepo Layout and Package Manager

- **Decision**: Use `pnpm` workspaces for the monorepo.
- **Rationale**: Fast installation, strict dependency resolution, and native workspace protocol (`workspace:*`) across packages (`packages/shared`, `packages/config`, `apps/api`, `apps/customer-web`, `apps/desktop`).
- **Structure**:
  - `backend/`: Express + TypeScript, Socket.io gateway, background workers (purge, sweeper), storage provider.
  - `business/`: Desktop app (Tauri v2 + Next.js UI for Windows print cafe operator).
  - `customer/`: Customer mobile web app (Next.js 14+ PWA, camera scanner, cart, live pricing, tracking).
  - `packages/shared/`: Canonical Zod schemas, TypeScript types, print-type catalog, and deterministic pricing engine.
  - `packages/config/`: Shared ESLint and TypeScript configurations.
  - `docs/`: Architecture, threat models, runbooks, and design decisions.

---

## 2. Default Payment and Print Behavior

- **Decision**: Default `printBeforePayment = true` (print immediately upon shopkeeper acceptance), configurable per business in their profile settings.
- **Rationale**: Minimizes customer turnaround time for small print shops where trust is high or payments are collected at the counter. Shops that prefer advance verification can toggle `printBeforePayment = false`.

---

## 3. Document Format Strategy

- **Decision**: All client-side inputs (camera scans, JPEG/PNG/WebP/HEIC photos) are converted or wrapped into standard PDF documents on the customer device before uploading.
- **Rationale**:
  - The desktop print engine only needs to consume and render a single uniform document format: standard PDF.
  - Consistent N-up imposition, page counting, and orientation handling across all print requests.
  - Avoids heavy server-side conversion dependencies (such as LibreOffice or ImageMagick) on the API.

---

## 4. Single Active Desktop Agent per Shop

- **Decision**: Exactly one active desktop agent device session per business account in v1.
- **Rationale**: Simplifies print job routing, avoids race conditions between multiple spoolers, and allows crisp takeover semantics when a shopkeeper switches PCs.

---

## 5. Storage Provider Abstraction

- **Decision**: Abstract object storage behind a `StorageProvider` interface (`presignUpload`, `presignDownload`, `headObject`, `deleteObject`, `deletePrefix`).
- **Rationale**:
  - Allows seamless switching between Backblaze B2 (S3-compatible) and Cloudflare R2 via environment variables.
  - Enables a `LocalDiskStorageProvider` for development and automated testing without external cloud credentials.
  - Ensures atomic versioned deletions (`VersionId` support for B2) to guarantee complete data eradication.
