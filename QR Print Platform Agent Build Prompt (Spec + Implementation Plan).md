# QR Print Platform: Agent Build Prompt

*Part 1: Project description and requirements. Part 2: Implementation plan. Paste both into your agent as the build brief.*

---

# PART 1: PROJECT DESCRIPTION AND REQUIREMENTS

## 0. Role and instructions to the agent

You are a senior full-stack and desktop engineer. Build a production-grade system that lets customers of small print/photocopy cafes upload or scan documents from their phone by scanning a QR code, and lets the shopkeeper print them with one click, silently, with zero manual file handling. Follow the requirements below exactly. Where a requirement is ambiguous, choose the simplest option that satisfies security and performance goals and write the decision in `docs/decisions.md`. Work in phases (Part 2, section 13), and finish and test each phase before the next.

## 1. Problem

Today a customer at a cafe asks for a photocopy. The shopkeeper says "send it on WhatsApp", downloads every file, opens each one, asks about B&W or colour and copies, prints one by one, and hands over the pages. For the shopkeeper this is interruptive side work. For the customer, personal documents (Aadhaar, fee receipts, certificates) stay forever in WhatsApp and the shopkeeper's gallery.

## 2. Solution overview

Three components and one storage layer:

1. **Business Desktop App (Windows)**: Tauri v2 + Next.js (static export). Runs in the system tray, keeps a live connection to the backend, shows an actionable toast for each print request, and prints silently on the chosen printer.
2. **Customer Web App (PWA)**: Next.js, opened by scanning the shop's QR code. No customer login. Upload PDF/images, scan physical pages, set per-document print options, see the live price, submit, pay, and track status.
3. **Backend API**: Node.js + Express + MongoDB, with a WebSocket gateway. Handles business accounts, pricing, jobs, real-time delivery, payment bookkeeping, analytics, and guaranteed deletion.
4. **Temporary object storage**: S3-compatible bucket holding documents only for the life of a job (max 10 minutes), accessed through short-lived presigned URLs.

Core promise: **documents exist only between upload and print completion, are never viewable by the shopkeeper, and are deleted everywhere within 30 seconds of print completion.**

## 3. Actors

- **Business owner/operator**: logs into the desktop app, configures prices, printers and UPI ID, accepts or rejects jobs, sees analytics.
- **Customer**: anonymous visitor who scanned the QR. Identified only by a signed anonymous session and the name they type.
- **System**: scheduled sweepers and the deletion pipeline.

## 4. Functional requirements

### 4.1 Business account and onboarding

- F1. Sign up and log in with email + password (argon2id hashing). Optional later: phone OTP.
- F2. On signup the server creates a `businessId` (internal) and an unguessable public slug (e.g. 10-char nanoid) used in the QR URL `https://<domain>/p/<slug>`. The internal Mongo id is never exposed publicly.
- F3. Business profile: shop name, address (optional), logo (optional, small), UPI ID (VPA), payee display name, open/closed toggle.
- F4. The app can display and export the shop QR code as a printable A5/A4 poster (shop name, QR, "Scan to print"). Regenerating the slug invalidates the old QR.
- F5. Device registration: each installed desktop app registers as a device (device id + name). V1 supports exactly one active desktop agent per business; a second login shows a clear "already active on another device" prompt with a takeover option.

### 4.2 Pricing configuration (fixed catalog, owner sets only the prices)

The catalog of print types is hardcoded and identical for every business so the customer UI and price engine stay consistent:

| Key | Meaning |
| --- | --- |
| `A4_BW_SINGLE` | A4, black and white, one side |
| `A4_COLOR_SINGLE` | A4, colour, one side |
| `A4_BW_DOUBLE` | A4, black and white, duplex (per sheet) |
| `A4_COLOR_DOUBLE` | A4, colour, duplex (per sheet) |
| `A3_BW_SINGLE`, `A3_COLOR_SINGLE` | optional A3 |

- F6. For each key the owner sets: `enabled` (boolean) and `price` (rupees per printed side or per sheet as defined in the key; stored as **integer paise**). Disabled types are unavailable to customers.
- F7. Optional extras with prices: `scanFeePerPage` (for the scanned-from-camera path), `minimumOrder`.
- F8. Prices are validated server-side (0 < price <= configurable max). Pricing changes apply only to new jobs; each job stores a **price snapshot**.
- F9. If the connected printer cannot do colour or duplex, the app warns the owner and prevents enabling those types (detected via printer capabilities).

### 4.3 Printer management (desktop app)

- F10. Enumerate all printers visible to Windows (USB, network, shared, Wi-Fi) with name, status (ready, offline, paper out, error), and capabilities (colour, duplex, paper sizes).
- F11. Owner picks the **default printer** inside the app. Printing always targets the selected default (not necessarily the Windows default). Selection persists locally.
- F12. Live printer status refresh (spooler change notifications, polling fallback every 5 s when idle is NOT acceptable; use event-driven notifications). Status shown in tray tooltip and on the main window.
- F13. Per-job failure handling: if the printer is offline/out of paper/jammed, the job moves to `FAILED_PRINT` (retryable) and the owner gets a toast with "Retry". The customer sees "Shop is fixing a printer issue".

### 4.4 Customer flow

- F14. Scanning the QR opens the shop page: shop name/logo, availability (**Open + printer online** or **Closed/Offline**), price list of enabled types. If the shop agent is offline, uploads are blocked with a clear message.
- F15. A **cart** of documents (max 20 documents, 200 pages total, 25 MB per file, configurable). Each document is one of three kinds:
  - **PDF upload**: file picker. Validated client-side and server-side (magic bytes, not just extension; encrypted/password PDFs rejected with a clear message).
  - **Image upload**: JPG, PNG, WebP, HEIC/HEIF (iPhone). Multiple images may be added as separate documents, or the customer can choose "combine selected images into one document".
  - **Scan physical document**: camera-based multi-page scanner (see 4.5).
- F16. **Per-document preview**: PDF page thumbnails (lazy rendered), image preview, scanned-page strip. Customer can remove, reorder pages (scans), and rename.
- F17. **Per-document print options** (each saved with the document):
  - Copies (1-99)
  - Colour mode: B&W or Colour (**disabled with a tooltip if the shop doesn't offer it**)
  - Sides: single or double (disabled if not offered)
  - Paper size: A4 (A3 only if enabled)
  - Pages per sheet (N-up): 1, 2, 4, 6, 9
  - Page range (e.g. `1-3,5`) for PDFs
  - Orientation: auto (default), portrait, landscape
  - Fit mode for images: fit to page (default), fill, original size
- F18. **Live price**: after each change the client requests a quote from the server (debounced). Server computes; UI shows per-document and total price. The price shown at submit time is final (snapshot) and is recomputed server-side on submit; mismatch with the client's quote returns an error and re-quote.
- F19. Customer enters **name** (required) and optional phone (for pickup calls, default off). Chooses payment: **Pay via UPI** or **Pay at counter**.
- F20. On "Send to shop" the job is submitted and the customer gets a short **job code** (e.g. `K7-42`) and a live status page: `Waiting for shop` -> `Accepted` -> `Printing` -> `Ready for pickup` (and `Rejected`, `Expired`, `Printer issue`). The customer can cancel before acceptance (documents are deleted at once).
- F21. Session recovery: if the customer closes the tab, reopening the page restores the in-progress cart or status page via a signed session token stored in the browser.
- F22. Language: English and Hindi UI strings (i18n-ready from day one).

### 4.5 Physical document scanner (customer web)

- F23. Opens the rear camera with `getUserMedia`, with a file-input camera-capture fallback.
- F24. Capture page -> **auto edge detection** proposes a quadrilateral -> customer adjusts four corner handles -> **perspective correction** produces a flat page.
- F25. Enhancement filters: Original, Auto-enhance, Grayscale, Black & white (adaptive threshold). B&W is the default if the customer chose B&W printing.
- F26. After adding a page, the scanner offers "Add another page". All pages of one scan session form **one document** that shares the same options. Pages can be retaken, deleted, and reordered.
- F27. The scan is assembled **on the device** into a single PDF (one page per scan) before upload, so the backend and the agent only ever handle PDFs for scans.

### 4.6 Real-time delivery and acceptance (business app)

- F28. On submit, the backend creates the job and pushes a `job.new` event to the business agent over WebSocket within 1-2 s.
- F29. The agent shows a **custom toast window in the bottom-right** of the primary display (always on top, does not steal focus): job code, customer name, number of documents, total pages/sheets, colour/B&W summary, total price, payment mode. Buttons: **Accept** and **Reject**. Optional sound. Multiple pending jobs stack.
- F30. **Accept** starts printing immediately and silently (no print dialog, no window switch). One click.
- F31. **Reject** asks for nothing by default (optional quick reasons: busy, printer issue, closing soon) and notifies the customer. Documents are deleted immediately if already paid through upi no reject option should be there as then business must have to print or they have to revert the payment manually if unable to print due to some technical issue or something.
- F32. The same pending jobs appear in the main window's "Requests" tab with the same Accept/Reject actions. An action taken in either place updates both.
- F33. If nobody responds, the job expires after a configurable time (default 5 min, max 10 min): status `EXPIRED`, documents deleted.
- F34. Owner controls: **Pause requests** (shop temporarily busy), auto-accept toggle (optional, for shops that want it), Do Not Disturb for sounds.
- F35. FIFO print queue per printer. Only one job prints at a time; the rest wait in `QUEUED`.

### 4.7 Silent printing

- F36. All settings come from the job: copies, colour/B&W, duplex, paper size, N-up, page range, orientation. No dialogs.
- F37. Colour mode must actually be enforced (B&W job must print in monochrome even on a colour printer, via device mode settings or by grayscale rendering).
- F38. Documents are fetched into **memory** (or an app-private, access-restricted temp directory if unavoidable), rendered, and sent to the printer. The app offers **no feature to open, view, save, or export** a customer document.
- F39. Completion is detected from the Windows spooler (job leaves the queue without error), then status `PRINTED` is sent to the backend.

### 4.8 Payment (no gateway in v1)

- F40. UPI: backend builds a UPI intent URI (`upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<job code>&tr=<job id>`). On mobile the page opens the UPI app chooser; on desktop it shows a QR. Customer taps "I've paid".
- F41. Payment is **self-reported by the customer and confirmed by the shopkeeper** (button "Mark as paid" in the toast follow-up/Requests tab). Without a gateway, the system cannot verify money movement; the UI says so honestly.
- F42. Pay at counter: job is marked `PAY_AT_COUNTER` and the owner marks it paid on collection.
- F43. Owner setting: *print immediately* (default) or *print only after payment is marked paid*.
- F44. Payment states: `UNPAID`, `CUSTOMER_CLAIMED_PAID`, `PAID_CONFIRMED`, `PAY_AT_COUNTER`. Stored with the job stats.

### 4.9 Deletion and privacy

- F45. Documents are deleted from the bucket, backend, agent memory/temp and the customer's browser within **30 seconds** of: print completion, rejection, cancellation, expiry, or terminal failure.
- F46. A sweeper runs every minute and force-deletes anything past its TTL (hard max 10 minutes from upload) so no file survives even if the agent or API crashed.
- F47. After deletion the database keeps only: job code, timestamps, number of documents, pages, sheets, copies, colour/B&W split, paper size, price, payment state, customer first name (retention 90 days, configurable). **No file names, no storage keys, no thumbnails, no content.**
- F48. The business has no API or UI path that returns document bytes, file names or thumbnails. The API enforces this (the agent's download endpoint is valid only for accepted jobs, one-time, and only to the agent device).
- F49. A visible privacy note on the customer page: "Your files are deleted right after printing."

### 4.10 Dashboard and analytics

- F50. Business dashboard (inside the desktop app): today/week/month totals for jobs, documents, pages, sheets, revenue (confirmed vs pending), B&W vs colour split, average job value, peak hours, rejected/expired counts.
- F51. Job history list (code, time, name, pages, amount, payment state, status) with CSV export. No document content.

### 4.11 Desktop app behaviour

- F52. **System tray**: closing the window hides/destroys the UI and keeps the app running; **Quit only from the tray menu**. Tray menu: Open, Pause/Resume requests, Default printer (submenu), Connection status, Start with Windows, Quit.
- F53. Single instance (launching again focuses the existing instance).
- F54. Optional auto-start with Windows (default on, can be toggled).
- F55. Auto-reconnect with backoff, offline indicator, and recovery of pending jobs on reconnect.
- F56. Secure token storage in Windows Credential Manager; silent re-login.
- F57. Auto-update (signed) via Tauri updater.

## 5. Non-functional requirements

### 5.1 Performance and resource use

- N1. Idle resource use with the window closed: **< 60 MB RAM and \~0% CPU**. The network connection, tray, notifications and print engine live in the **Rust core**, not in the WebView, so the WebView can be destroyed when the window is closed.
- N2. Toast appears **< 2 s** after the customer submits (p95).
- N3. From Accept to first sheet leaving the printer **< 3 s** for a 10-page PDF on a local printer (excluding printer warm-up).
- N4. Bandwidth: scanned pages <= \~300 KB (B&W) / <= \~500 KB (colour) at 200 DPI A4 equivalent; photos downscaled to A4@200-300 DPI; PDFs uploaded as-is; the customer page's first load < 250 KB JS gzip (lazy-load scanner/PDF libs).
- N5. The customer page works on mid-range Android and iPhone browsers over 4G; uploads show progress and survive brief connection drops (retry with backoff).

### 5.2 Security

- N6. TLS everywhere; HSTS; strict CORS; CSP on web apps.
- N7. Auth: short-lived access JWT (15 min) + rotating refresh token for the desktop app; customers use a signed anonymous session token scoped to one shop, with limited lifetime.
- N8. Object storage bucket is **private**; all access by presigned URLs (upload: 10 min, download: 60 s, single object, single method).
- N9. Server-side validation of everything the client sends (zod schemas shared across apps). Never trust client-computed price, page counts or MIME types. The server recomputes page count by parsing the uploaded PDF.
- N10. Rate limiting and abuse protection: per-IP and per-shop limits on quotes, uploads, submits; max active jobs per customer session; optional Cloudflare Turnstile at submit.
- N11. Upload hardening: size caps, magic-byte checks, reject encrypted PDFs, reject PDFs with embedded files/JavaScript (strip or reject), render PDFs only with a memory-safe or sandboxed renderer.
- N12. Business cannot access documents (see F38, F48). Be explicit in the docs about the residual limits: the shopkeeper's own PC is trusted at the OS level (spooler temp files, screen capture), and the system mitigates this by minimizing disk writes and not offering any viewing features.
- N13. No PII in logs. Audit log for business auth events and settings changes.

### 5.3 Reliability

- N14. Jobs are never lost: persistent job state in MongoDB, idempotent events (event ids), agent fetches missed pending jobs on reconnect.
- N15. Deletion is **guaranteed** by three layers: immediate deletion on terminal state, retry queue for failures, and the sweeper plus a bucket lifecycle rule as a final safety net.
- N16. Graceful degradation: if the agent is offline the customer is told before uploading; if the API restarts, WebSockets reconnect without losing state.

### 5.4 Usability and maintainability

- N17. One-click accept; no required screen switching for the shopkeeper.
- N18. Mobile-first, thumb-friendly customer UI, WCAG AA contrast, large tap targets.
- N19. Monorepo with shared TypeScript types and a shared pricing/price-calculation package, unit tested.
- N20. Structured logging (pino), health endpoints, error tracking (Sentry), basic metrics.

## 6. Out of scope for v1 (design so they can be added)

Payment gateway with automatic verification, multiple agents/printers per business, Mac/Linux desktop app, native mobile apps, document editing, Word/Excel/PPT upload (convert later using LibreOffice headless on the server), customer accounts, multi-staff roles.

---

# PART 2: IMPLEMENTATION PLAN

## 1. Architecture

```
Customer phone (Next.js PWA)
   | HTTPS REST (quote, session, submit)
   | presigned PUT  ------------------------------->  S3-compatible bucket (private, temp)
   v                                                        ^
Express API  <--- WebSocket (Socket.IO or ws) --->  Tauri agent (Rust core)
   |                                                        | presigned GET (60 s)
MongoDB (businesses, jobs, stats)                           v
                                                  Render in memory -> Windows spooler -> Printer
```

**Key principle:** files travel customer -> bucket -> agent directly. The Express server handles only metadata and signed URLs, so it never carries file bandwidth.

## 2. Repository layout (pnpm monorepo)

```
/apps/api            Express + TS, Socket gateway, workers
/apps/customer-web   Next.js (App Router), PWA, i18n
/apps/desktop        Tauri v2: /src-tauri (Rust) + /ui (Next.js static export)
/packages/shared     zod schemas, types, print-type catalog, price engine, constants
/packages/config     eslint, tsconfig
/docs                decisions.md, threat-model.md, runbook.md
```

The **price engine lives in `packages/shared`** and is used by the API (authoritative) and the customer UI (preview only).

## 3. Temporary storage: recommendation

**Heads-up on b2blaze:** it is a *Python* SDK. Your backend is Express, so use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` pointed at Backblaze B2's S3-compatible endpoint. This is the same "B2 with S3 configuration" idea, just with the correct Node tooling.

**Recommended design: a `StorageProvider` interface with one default implementation.**

```ts
interface StorageProvider {
  presignUpload(key, contentType, maxBytes, ttlSec): Promise<{url, headers}>
  presignDownload(key, ttlSec): Promise<string>
  headObject(key): Promise<{size, contentType, versionId?}>
  deleteObject(key, versionId?): Promise<void>
  deletePrefix(prefix): Promise<void>
}
```

Implementations: `S3Storage` (B2 or R2, selected by env vars) and `LocalDiskStorage` (dev and tests).

**Which bucket provider?**

| Option | Pros | Cons |
| --- | --- | --- |
| **Backblaze B2 (S3 API)** | Cheap, free first 10 GB, free egress up to 3x stored, you asked for it | No India region (US/EU), so uploads from India have higher latency; bucket versioning means plain delete only *hides* a file |
| **Cloudflare R2** | No egress fees, S3 API, no versioning complexity, global edge for uploads | Lifecycle granularity is days |
| Own VPS disk (Mumbai) | Lowest latency for Indian users, simplest delete | You serve all upload/download bandwidth and must harden the host |

Start with B2 as you planned. Because of the interface, switching to R2 is an env change. Measure real upload times from Lucknow mobile networks before committing.

**B2-specific rules (important for the "deleted everywhere" promise):**

- Store the `x-amz-version-id` returned after upload and delete with `DeleteObject` **including `VersionId`**, otherwise B2 only adds a hide marker and the bytes remain.
- Add a bucket lifecycle rule (hide after 1 day, delete 1 day after hiding) as the final safety net. B2 lifecycle works in whole days, so it is only a backstop; the 30 s guarantee comes from app-level deletion.
- Private bucket, CORS allowing only your customer-web origin for `PUT`.
- Object key: `jobs/<jobId>/<docId>.<ext>` (random ids, no filenames, no PII).
- Set `Cache-Control: no-store` and avoid CDN caching.

**Optional hardening (phase 2): end-to-end encryption.** The customer browser generates a random AES-GCM key per job (WebCrypto), encrypts before upload, and the key travels with the job event only to the agent. The bucket then contains ciphertext only, which also protects against a storage-provider breach.

## 4. Data model (MongoDB, Mongoose or the official driver)

**businesses**

```
_id, email (unique), passwordHash (argon2id), shopName, slug (unique, indexed),
upiId, payeeName, isOpen, acceptPaused, printBeforePayment (bool),
pricing: { [catalogKey]: { enabled, pricePaise } }, extras, limits,
agent: { deviceId, deviceName, lastSeenAt, printerCaps },
createdAt, updatedAt
```

**jobs** (state + stats; no file names after purge)

```
_id, code (short, unique per business per day), businessId (indexed), sessionId,
status, customerName, customerPhone?, paymentMode, paymentState,
snapshot: { priceTable, currency },
docs: [{ docId, kind, storageKey, versionId, sizeBytes, pages, options{...}, priceSubtotalPaise }],
totals: { documents, pages, sheets, bwSheets, colorSheets, pricePaise },
expiresAt (TTL deadline), purgeAfter, purgedAt, printedAt, createdAt
```

On purge, `docs[].storageKey`, `versionId` and any names are `$unset`; options and counts stay for analytics.

**dailyStats** `{ businessId, date, jobs, docs, pages, sheets, bwSheets, colorSheets, revenueConfirmedPaise, revenuePendingPaise, rejected, expired, hourly[24] }` updated with `$inc` on each terminal state.

**refreshTokens**, **auditLog** (auth events, settings changes).

Indexes: `jobs {businessId, createdAt}`, `jobs {status, expiresAt}` (for sweeper), TTL index on `jobs.customerName` retention via a scheduled `$unset` job (90 days), unique `businesses.slug`.

## 5. Backend (Express) design

**Modules:** `auth`, `business`, `pricing`, `public (customer)`, `jobs`, `storage`, `realtime`, `payments`, `stats`, `workers`.

**Public (customer) endpoints**

- `GET /public/shops/:slug` -> shop name, logo, open/online flag, enabled print types with prices.
- `POST /public/sessions` -> issues signed anonymous session JWT scoped to the shop (30 min, extendable while a job is active).
- `POST /public/uploads/presign` -> given `{filename-less metadata: kind, contentType, sizeBytes}` returns `{docId, uploadUrl}`. Enforces limits and active-job caps. Server generates the storage key.
- `POST /public/uploads/:docId/confirm` -> server does `HEAD`, checks size, then for PDFs fetches the first bytes (magic check) and parses the page count (pdf-lib or `qpdf --show-npages`). Rejects encrypted PDFs or PDFs with JavaScript or embedded files. Stores authoritative `pages`.
- `POST /public/quote` -> `{docs:[{docId, options}]}` returns per-doc and total price from the shared engine using the live shop pricing.
- `POST /public/jobs` -> validates everything again, creates the job with the price snapshot, status `SUBMITTED`, emits `job.new`.
- `GET /public/jobs/:id` and an SSE or WebSocket channel for live status. `POST /public/jobs/:id/cancel`. `POST /public/jobs/:id/payment-claim`.

**Business endpoints (JWT):** auth (`signup`, `login`, `refresh`, `logout`), `GET/PUT /me`, `PUT /me/pricing`, `PUT /me/upi`, `POST /me/slug/rotate`, `GET /jobs?status=`, `POST /jobs/:id/accept|reject|retry|mark-paid`, `GET /stats?range=`, `POST /agent/register`.

**Agent-only endpoints:** `POST /agent/jobs/:id/download-urls` (one-time; only valid when status is `ACCEPTED`/`PRINTING` and device id matches; returns 60 s presigned GETs), `POST /agent/jobs/:id/status` (`PRINTING`, `PRINTED`, `FAILED_PRINT`).

**Job state machine (enforced in one function, with atomic `findOneAndUpdate` on expected previous state):**

```
DRAFT -> SUBMITTED -> ACCEPTED -> QUEUED -> PRINTING -> PRINTED -> PURGED (terminal, success)
                |           |                    |
                |           |                    +-> FAILED_PRINT -> (retry) QUEUED  |  (TTL) PURGED
                +-> REJECTED -> PURGED
                +-> EXPIRED  -> PURGED
                +-> CANCELLED -> PURGED
```

Payment state is a separate field and never blocks the print state machine unless `printBeforePayment=false`.

**Real-time:** Socket.IO or raw `ws`, authenticated with the business JWT plus device id. Rooms per business. Events: `job.new`, `job.updated`, `settings.updated`, `agent.kick`. Every event has an `eventId` and a monotonically increasing `seq` per business; on reconnect the agent calls `GET /jobs?status=SUBMITTED,ACCEPTED,QUEUED,PRINTING,FAILED_PRINT` and reconciles. Heartbeat every 20 s; `agent.lastSeenAt` drives the shop's online/offline flag. Single instance for v1; add Redis adapter for scale-out later.

**Deletion pipeline (`workers/purge`)**

1. `purgeJob(jobId)`: for each doc `deleteObject(key, versionId)`, verify with `headObject` (expect 404), `$unset` keys, set `purgedAt`, emit `job.purged` (agent wipes memory).
2. Triggered immediately on `PRINTED`, `REJECTED`, `CANCELLED`, `EXPIRED`, and called through a retry queue (exponential backoff, up to \~10 tries, alert if still failing).
3. **Sweeper** every 60 s: find jobs with `status in terminal` and `purgedAt=null`, or `expiresAt < now`, or `FAILED_PRINT` older than 10 minutes since upload; purge them.
4. **Orphan sweeper** every 5 min: list `jobs/` prefix in the bucket, delete any object whose job is missing or purged, or older than 10 minutes.
5. Metric: `purge_latency_seconds` (print completion to deletion). Alert if p99 > 30 s.

**Security middleware:** helmet, strict CORS allow-list, `express-rate-limit` backed by Mongo or Redis, zod validation on every route, request size limits (JSON 100 KB), pino without PII, centralized error handler.

## 6. Customer web app (Next.js PWA)

**Routes:** `/p/[slug]` (shop landing), `/p/[slug]/cart`, `/p/[slug]/scan`, `/p/[slug]/checkout`, `/job/[id]` (status).

**State:** Zustand (or Redux Toolkit) for the cart; IndexedDB (idb) to keep in-progress scans and files so a refresh doesn't lose them; cleared on submit/cancel.

**Client processing pipeline (all in a Web Worker; lazy-loaded):**

- **PDF:** upload as-is. Use `pdfjs-dist` only for thumbnails (render at low scale, lazily, as the user scrolls) and for the page count preview.
- **Images:** decode with `createImageBitmap` (HEIC via `heic2any`, loaded only when needed). Apply EXIF orientation, downscale so the long edge <= 3508 px for colour photos (A4 @ 300 DPI) and <= 2480 px for B&W, re-encode JPEG quality \~0.8 (or grayscale JPEG if B&W was chosen). This typically takes 8 MB phone photos down to \~0.5-1 MB.
- **Images to PDF:** wrap into a PDF with `pdf-lib` (`embedJpg`, which embeds the JPEG bytes without recompressing), one image per page sized to A4 with the chosen fit mode. Decision: **always send a PDF to the agent**, so the print engine has a single input type and settings (N-up, copies, range) work uniformly.
- **Scanner:**
  - Camera at 1920x1080 or higher, capture frames to canvas.
  - Edge detection with a lightweight approach (jscanify or OpenCV.js built with only needed modules; lazy-load, cached by the service worker). Fallback: manual four-corner drag when detection fails.
  - Perspective transform to A4 ratio at \~1654x2339 px (200 DPI); filters: grayscale, adaptive threshold for B&W (small output, \~100-250 KB/page).
  - JPEG q 0.7-0.8, then assemble into one PDF per scanned document on-device.

**Upload:** request presigned PUT -> `XMLHttpRequest` PUT with progress (or fetch + streams) -> confirm. Parallel uploads limited to 3; automatic retry with backoff; resumable only if the file is > 25 MB (not allowed in v1, so single PUT).

**UX details:** options that the shop doesn't offer are rendered **disabled with a short reason** ("This shop doesn't offer colour printing"); price updates under each document and in a sticky footer; status page uses a live subscription with polling fallback; offline banner; Hindi/English via `next-intl`; PWA manifest + service worker caching of the shell only (never caches documents).

## 7. Desktop app (Tauri v2)

**Split of responsibilities**

- **Rust core (always running, tiny):** tray, single-instance, auto-start, WebSocket client (`tokio-tungstenite`), job queue, downloader (`reqwest`), PDF render, printing, credential storage (`keyring` crate -> Windows Credential Manager), notification/toast window management, updater.
- **UI (Next.js static export in WebView2):** login, dashboard, requests tab, pricing, printers, settings. Created on demand. **On window close, destroy the webview** (don't just hide it) so idle memory stays small; the Rust core keeps working.

**Tray and lifecycle:** Tauri `tray-icon`; intercept `WindowEvent::CloseRequested` -> `api.prevent_close()` and destroy/hide window; only the tray "Quit" calls `app.exit(0)`. Plugins: `single-instance`, `autostart`, `updater`, `shell` not needed.

**Toast (important correction):** Tauri's notification plugin does **not** provide clickable Accept/Reject action buttons on Windows. Native WinRT toasts with buttons need AUMID registration and a COM activator, which is fragile for unpackaged apps. **Decision: build the toast as a small borderless, always-on-top, non-focus-stealing Tauri window** anchored bottom-right of the work area (calculate with the monitor work-area API), 360x\~160 px, auto-stacking, with Accept/Reject buttons, a countdown bar for expiry, and optional sound. Use the Win32 `WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW` extended styles so clicking doesn't pull focus or show in the taskbar/Alt-Tab. Also fire a standard OS notification as a fallback if the toast window fails.

**Printer service (Rust, `windows` crate):**

- `EnumPrinters` for the list; `GetPrinter`/`DeviceCapabilities` for colour (`DC_COLORDEVICE`), duplex (`DC_DUPLEX`), paper sizes; `FindFirstPrinterChangeNotification` for status events.
- Selected printer name stored in local settings and synced to the business profile for the capability checks.

**Print engine (recommended approach):**

1. Download PDFs via presigned URLs into memory.
2. Render pages with **`pdfium-render`** (bundled PDFium DLL) to bitmaps at 200 DPI (colour) or 200 DPI grayscale (B&W).
3. Apply page range, N-up imposition (compose multiple pages onto one A4 canvas with margins and correct orientation), orientation and fit rules.
4. Print each sheet through GDI: create a printer DC with a `DEVMODE` that sets `dmCopies`, `dmColor` (`DMCOLOR_MONOCHROME` or `DMCOLOR_COLOR`), `dmDuplex`, `dmPaperSize`, `dmOrientation`; `StartDoc`/`StartPage`/`StretchDIBits`/`EndPage`/`EndDoc`. Collate by sheet order when copies > 1 (loop rather than rely on driver behaviour).
5. Track the job in the spooler (`GetJob` or change notifications) until it leaves the queue; success -> `PRINTED`; error states -> `FAILED_PRINT` with reason.
6. Zero buffers and drop references; call `purge ack` to the server.

*Faster v1 shortcut (acceptable, ship first):* bundle **SumatraPDF** as a Tauri sidecar and run `SumatraPDF.exe -print-to "<printer>" -print-settings "monochrome,2x,paper=A4" -silent file.pdf`. Sumatra handles copies, colour/mono and duplex but **not N-up**, so impose N-up yourself first (Rust `lopdf` or pdf-lib in the webview) and print the resulting PDF. Note this requires a short-lived temp file; place it in an app-private directory with restricted ACL, and securely overwrite and delete it immediately after printing. Check Sumatra's GPLv3 licence terms before distributing. Plan to replace this with the pdfium+GDI engine in a later phase so no plaintext ever touches disk.

**Queue:** an in-memory queue persisted minimally (job ids only) so a crash/restart can re-fetch pending jobs from the server. One printing worker per printer; configurable concurrency 1.

**Security in the desktop app:** no code path writes or exposes document bytes to the UI (UI only receives metadata); Tauri capability allow-lists are minimal; CSP strict; no `shell:open`; updater signature verified; tokens only in Credential Manager; WebView devtools disabled in release builds.

**Packaging:** NSIS installer (per-user install, no admin), code-signed (an unsigned installer triggers SmartScreen warnings), WebView2 bootstrapper included, auto-update endpoint with signature (minisign key kept offline).

## 8. Pricing engine (shared package)

Compute **sheets** and **printed sides**, then price:

```
sides(doc)      = ceil(selectedPages / pagesPerSheet)        // one printed side per N-up page
sheets(doc)     = duplex ? ceil(sides / 2) : sides
unitPrice       = pricing[catalogKey(paper, color, duplex)]  // per side (single) or per sheet (duplex), as defined by the key
docSubtotal     = copies * (duplex ? sheets : sides) * unitPrice
total           = max(sum(docSubtotals) + extras, minimumOrder)
```

All arithmetic in integer paise. Unit tests: N-up rounding, duplex odd pages, page ranges, copies, disabled types rejected, minimum order, snapshot immutability. The API stores both inputs and results in the job so the agent shows exactly what the customer saw.

## 9. Payments (no gateway)

- Shop UPI ID validated by regex (`name@bank`) on save.
- Build the UPI URI server-side; the customer page renders a "Pay with UPI" button (intent link) and a QR for desktop use.
- The customer taps "I've paid" -> `CUSTOMER_CLAIMED_PAID`; the shopkeeper confirms with one click -> `PAID_CONFIRMED`. Be transparent in UI copy that confirmation is manual. Revenue on the dashboard splits confirmed vs claimed.
- Design the `PaymentProvider` interface now (`createPayment`, `verify`) so Razorpay/Cashfree UPI can be added later without touching the job flow.

## 10. Security and threat model summary (write `docs/threat-model.md`)

| Threat | Mitigation |
| --- | --- |
| Shopkeeper tries to view customer documents | No view/export features, download URLs only to the agent, one-time, in-memory handling, deletion within 30 s |
| Leaked or guessed storage URLs | Private bucket, random keys, 60 s GET URLs, no filenames |
| Malicious PDF/image | Server and client validation, reject JS/embedded files/encrypted, memory-safe renderer, size/page caps |
| Spam or abuse of the QR page | Rate limits, session caps, Turnstile, shop pause button |
| Price tampering | Server recomputes everything, snapshot per job |
| Account takeover | argon2id, rate-limited login, refresh-token rotation, optional OTP later |
| Stale files after a crash | Immediate purge + retry queue + sweeper + orphan sweeper + bucket lifecycle |
| Printer spool leftovers | Documented residual risk; minimize disk writes; spool files are cleared by Windows after the job completes |
| QR poster replaced by an attacker's QR | Customer page shows shop name/logo and UPI payee name prominently so mismatches are noticeable |

## 11. Testing strategy

- **Unit:** price engine, state machine, validators, N-up layout math.
- **API integration:** supertest + mongodb-memory-server + a mock S3 (MinIO container). Include purge-latency tests and sweeper tests.
- **Customer web:** Playwright on mobile viewport (upload, options disabled states, price updates, scan flow with a fake camera stream).
- **Desktop:** Rust unit tests for imposition and DEVMODE building; manual and scripted tests with a **virtual printer** (Microsoft Print to PDF) plus at least one real USB and one real network printer; soak test (24 h, reconnects, 500 jobs).
- **Load:** k6 against the API (100 concurrent customers across 20 shops).
- **Security:** dependency audit in CI, OWASP ZAP baseline against staging, fuzz PDF validation with malformed files.

## 12. Deployment and operations

- API on a small VPS or container platform in an India region if available (Mumbai) behind Cloudflare; MongoDB Atlas; secrets in environment/secret manager; CI with GitHub Actions (lint, test, build, sign desktop installer).
- Health endpoints `/healthz` and `/readyz`; Sentry for API, web and desktop; dashboards for `purge_latency_seconds`, active agents, job funnel, error rates.
- Backup MongoDB (stats and accounts matter; documents are never backed up by design).
- Runbook: how to rotate the JWT secret, bucket keys, and the updater signing key.

## 13. Phased delivery

1. **Phase 1: Foundations.** Monorepo, shared schemas and price engine, Express + Mongo, business auth, pricing, shop slug and QR, storage provider with presigned URLs, job model and state machine, purge worker and sweeper.
2. **Phase 2: Desktop core.** Tauri shell, tray, single instance, login, WebSocket client with reconnect, printer enumeration and selection, custom toast window, Requests tab.
3. **Phase 3: Customer web (PDF path).** Shop page, PDF upload, options UI with disabled states, live quote, submit, status page.
4. **Phase 4: End-to-end printing.** Silent print engine (Sumatra shortcut first), N-up, copies, colour/B&W, spooler completion tracking, immediate purge, deletion verification.
5. **Phase 5: Images and scanner.** Image pipeline (compress, HEIC, to-PDF), camera scanner with crop, filters, multi-page assembly.
6. **Phase 6: Payments and analytics.** UPI flow, manual confirmation, dashboard and CSV export.
7. **Phase 7: Hardening and release.** Replace Sumatra with pdfium+GDI, optional E2E encryption, load and security testing, installer signing, auto-update, i18n polish, pilot with 2-3 real cafes.

## 14. Acceptance criteria (definition of done)

- A customer can scan the QR, upload a PDF, an image and a 3-page scan, set different options per document, see a server-calculated price, and submit.
- The shopkeeper sees a bottom-right toast within 2 s and prints everything with **one click** and no dialogs, on the chosen printer, with colour/B&W, copies and N-up honoured.
- Closing the app window keeps it running in the tray; Quit works only from the tray; reconnect after Wi-Fi loss recovers pending jobs.
- Disabled print types cannot be selected, and the API rejects them even if the client is tampered with.
- After printing, the bucket object (all versions), backend references and agent memory are gone within 30 s; the dashboard retains only counts and amounts; no API returns document content to the business.
- Idle desktop app memory < 60 MB with the window closed; p95 toast latency < 2 s; scanned page uploads <= 500 KB.

## 15. Questions for you (answers change the design slightly)

1. Should *print before payment* be the default, or should shops choose per shop (the plan assumes per-shop setting, default print immediately)?
2. Do you want Word/PPT/Excel uploads in v1? (The plan defers them to avoid running LibreOffice conversions on the server.)
3. Is one desktop PC per shop enough for v1? (The plan assumes yes.)
