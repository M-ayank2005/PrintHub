<p align="center">
  <img src="https://img.shields.io/badge/PrintHub-QR%20Print%20Platform-7C3AED?style=for-the-badge&logo=printer&logoColor=white" alt="PrintHub" />
</p>

<h1 align="center">🖨️ PrintHub — QR Print Platform</h1>

<p align="center">
  <strong>Scan. Upload. Print. Done.</strong><br/>
  The privacy-first, zero-touch printing platform for Indian print & photocopy shops.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.5+-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-14+-000000?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=black" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Rust-2021-DEA584?logo=rust&logoColor=black" alt="Rust" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/pnpm-Monorepo-F69220?logo=pnpm&logoColor=white" alt="pnpm" />
</p>

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Key Differentiators](#-key-differentiators--why-printhub-stands-out)
- [Architecture Overview](#-architecture-overview)
- [System Components](#-system-components)
- [Business Setup Guide](#-business-setup-guide)
- [Customer Experience](#-customer-experience)
- [Document Scanner](#-built-in-document-scanner)
- [Privacy & Security](#-zero-trace-privacy--security-architecture)
- [Silent Printing Engine](#-silent-printing-engine)
- [Payment System](#-payment-system)
- [Analytics Dashboard](#-analytics--business-intelligence)
- [Internationalization](#-internationalization-i18n)
- [Repository Structure](#-repository-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [CI/CD](#-cicd)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 😩 The Problem

Every day in thousands of print shops across India, the same painful ritual repeats:

> _Customer walks in → "Send it on WhatsApp" → Shopkeeper downloads files → Opens each one → Asks "B&W or colour? How many copies?" → Prints one by one → Hands over the pages._

**For the shopkeeper**, this is slow, interruptive side-work that kills productivity.  
**For the customer**, personal documents — Aadhaar cards, fee receipts, certificates — remain forever in WhatsApp chats and the shopkeeper's phone gallery. **A privacy nightmare.**

---

## 💡 The Solution

**PrintHub** replaces the entire WhatsApp workflow with a single QR code scan:

```
Customer scans QR → Uploads files from phone → Sets print options → Pays →
Shopkeeper gets instant notification → One-click Accept → Documents print silently →
Files are permanently deleted within 30 seconds.
```

**No WhatsApp. No file sharing. No manual handling. No privacy compromise.**

---

## 🏆 Key Differentiators — Why PrintHub Stands Out

### 🔒 Zero-Trace Privacy (Our Core Promise)
Documents exist **only** between upload and print completion. They are **permanently deleted everywhere** — from cloud storage, server memory, desktop app, and browser — within **30 seconds** of printing. No file names, no thumbnails, no content survives. The shopkeeper **cannot view, save, export, or access** customer documents at any point. This isn't a policy — it's enforced by architecture.

### ⚡ One-Click Silent Printing
The shopkeeper never sees a print dialog, never opens a file, never switches windows. A toast notification appears → they click **Accept** → documents print silently with all customer-specified settings (copies, colour/B&W, duplex, N-up, page range) applied automatically.

### 📱 Built-In Document Scanner
Customers can scan physical documents (Aadhaar, certificates, handwritten notes) directly from their phone camera — with **auto edge detection**, **perspective correction**, and **enhancement filters** (Auto, Grayscale, B&W). Multi-page scans are assembled into a single PDF on-device before upload.

### 💰 Transparent Live Pricing
Customers see the **exact price** updating in real-time as they adjust print options. The server recomputes and validates all pricing — **price tampering is impossible**. Each job stores a price snapshot so there are never billing disputes.

### 🌐 Zero Customer Friction
No app download. No account creation. No login. Customer scans a QR code, and the web app opens instantly. Works on any phone browser over 4G. Hindi and English supported from day one.

### 🖥️ Lightweight Desktop Agent
The Tauri v2 + Rust desktop app runs silently in the system tray, using **< 60 MB RAM and ~0% CPU** when idle. The UI webview is destroyed when the window is closed — only the Rust core (networking, printing, notifications) stays alive.

### 🔄 Bulletproof Reliability
Jobs are **never lost**. The system survives server restarts, Wi-Fi drops, app crashes, and printer jams — with automatic reconnection, job recovery, and a multi-layered deletion guarantee backed by 5 independent safety mechanisms.

---

## 🏗 Architecture Overview

```
┌─────────────────────┐        HTTPS REST + Presigned PUT        ┌──────────────────────────┐
│   Customer Phone    │ ─────────────────────────────────────────▶│  S3-Compatible Bucket    │
│   (Next.js PWA)     │                                          │  (Backblaze B2 / R2)     │
│                     │        REST (quote, session, submit)      │  Private, Temp Storage   │
│   • PDF Upload      │ ◀────────────────────────────────────────▶│  Max TTL: 10 minutes     │
│   • Image Upload    │                                          └────────────┬─────────────┘
│   • Camera Scanner  │                                                       │
└────────┬────────────┘                                            Presigned GET (60s)
         │ HTTPS                                                              │
         ▼                                                                    ▼
┌─────────────────────────────────────────┐        WebSocket       ┌──────────────────────────┐
│         Express API Server              │◀══════════════════════▶│   Tauri Desktop Agent    │
│                                         │     (Socket.IO)        │   (Rust Core + Next.js)  │
│   • Auth (Argon2id + JWT)               │                        │                          │
│   • Job State Machine                   │                        │   • System Tray          │
│   • Price Engine (server-authoritative) │                        │   • Toast Notifications  │
│   • Presigned URL Generation            │                        │   • Silent Printing      │
│   • Purge Workers + Sweepers            │                        │   • Printer Management   │
│   • Rate Limiting + Validation          │                        │   • Credential Manager   │
│                                         │                        │   • Auto-Update          │
│         MongoDB Atlas                   │                        └──────────────────────────┘
│   (businesses, jobs, stats, tokens)     │
└─────────────────────────────────────────┘

Key Principle: Files travel Customer → Bucket → Agent directly.
The API server handles only metadata and signed URLs — it never carries file bandwidth.
```

---

## 🧩 System Components

### 1. Customer Web App (PWA)
A mobile-first Progressive Web App built with **Next.js 14+**. Opens instantly via QR code — no install, no login required.

| Feature | Details |
|---|---|
| **PDF Upload** | File picker with magic-byte validation. Encrypted/password PDFs rejected with clear message. |
| **Image Upload** | JPG, PNG, WebP, HEIC/HEIF (iPhone). Auto EXIF correction, downscaling to print-quality DPI. |
| **Camera Scanner** | Multi-page document scanner with edge detection, perspective correction, and filters. |
| **Print Options** | Per-document: copies (1-99), colour/B&W, single/duplex, A4/A3, N-up (1/2/4/6/9), page range, orientation, fit mode. |
| **Live Pricing** | Real-time price calculation with server validation. Per-document and total cost breakdown. |
| **Order Tracking** | Live status updates: Waiting → Accepted → Printing → Ready for Pickup. |
| **Session Recovery** | Closing the tab doesn't lose progress. Cart and status restore on revisit. |
| **Offline Awareness** | Clear messaging when the shop is offline. Uploads blocked with explanation. |

### 2. Business Desktop App (Windows)
A **Tauri v2** desktop application with a Rust core and Next.js UI, designed for zero-distraction operation.

| Feature | Details |
|---|---|
| **System Tray** | Runs silently in the tray. Window close hides the app; Quit only from tray menu. |
| **Toast Notifications** | Custom always-on-top, non-focus-stealing toast windows with Accept/Reject buttons. |
| **Silent Printing** | One-click accept triggers silent printing — no dialogs, no window switching. |
| **Printer Management** | Enumerate all printers (USB, network, Wi-Fi), live status monitoring, capability detection. |
| **Dashboard** | Today/week/month analytics: jobs, pages, revenue, B&W vs colour split, peak hours. |
| **Requests Tab** | Pending and historical jobs with accept/reject/retry/mark-paid actions. |
| **Settings** | Pricing configuration, UPI setup, printer selection, open/closed toggle, pause controls. |
| **QR Poster** | Generate and export printable A5/A4 QR poster with shop name and branding. |

### 3. Backend API
A **Node.js + Express + TypeScript** API server with MongoDB, WebSocket gateway, and background workers.

| Module | Responsibility |
|---|---|
| **Auth** | Email + password registration/login, Argon2id hashing, JWT access/refresh tokens. |
| **Business** | Profile management, pricing configuration, UPI settings, device registration. |
| **Public** | Shop info, anonymous sessions, presigned uploads, upload confirmation, quoting, job submission. |
| **Jobs** | Atomic state machine, status transitions, accept/reject/retry/mark-paid operations. |
| **Storage** | `StorageProvider` interface with S3 (B2/R2) and LocalDisk implementations. |
| **Realtime** | Socket.IO gateway with JWT auth, heartbeat tracking, job event broadcasting. |
| **Purge Workers** | Immediate deletion, retry queue, 60s sweeper, 5min orphan sweeper. |
| **Stats** | Daily aggregated analytics with `$inc` updates on each terminal state. |

### 4. Shared Package (`@printhub/shared`)
A canonical TypeScript package consumed by all three apps:

- **Zod Schemas** — Shared request/response validation across client and server
- **Print Catalog** — Hardcoded print type definitions (A4/A3, B&W/Colour, Single/Duplex)
- **Pricing Engine** — Deterministic price calculation (sides, sheets, N-up, copies) in integer paise
- **Type Definitions** — Job statuses, payment states, document kinds, print options
- **Constants** — System limits, TTLs, token lifetimes

---

## 🏪 Business Setup Guide

### Step 1: Create Your Account

```
1. Download and install the PrintHub Desktop App (Windows NSIS installer)
2. Launch the app → Click "Sign Up"
3. Enter your email and a strong password
4. Your unique shop slug is auto-generated (e.g., `cyber-corner`)
```

### Step 2: Configure Your Shop Profile

```
Shop Name:     "Gupta Cyber Cafe"
Address:       "Near SBI ATM, Hazratganj" (optional)
Logo:          Upload your shop logo (optional)
Open/Closed:   Toggle your availability
```

### Step 3: Set Your Pricing

Configure prices for each print type you offer. Disable types you don't support:

| Print Type | Example Price | Toggle |
|---|---|---|
| A4 Black & White (Single Side) | ₹2.00 / side | ✅ Enabled |
| A4 Colour (Single Side) | ₹10.00 / side | ✅ Enabled |
| A4 Black & White (Duplex) | ₹3.00 / sheet | ✅ Enabled |
| A4 Colour (Duplex) | ₹18.00 / sheet | ✅ Enabled |
| A3 Black & White | ₹5.00 / side | ❌ Disabled |
| A3 Colour | ₹20.00 / side | ❌ Disabled |

> **Smart Validation:** If your connected printer doesn't support colour or duplex, PrintHub automatically prevents you from enabling those types.

### Step 4: Configure Payment

```
UPI ID (VPA):      gupta.cyber@paytm
Payee Display Name: Gupta Cyber Cafe
Print Before Payment: ✅ Yes (default) — or toggle off to require payment first
```

### Step 5: Select Your Printer

```
1. PrintHub auto-detects all connected printers (USB, Network, Wi-Fi, Shared)
2. Select your default printer from the list
3. Live status monitoring shows: Ready ✅ | Offline ⚠️ | Error ❌
4. Printer capabilities (colour, duplex, paper sizes) are auto-detected
```

### Step 6: Display Your QR Code

```
1. Go to the QR Poster tab
2. Export a printable A5 or A4 poster with your shop name and QR code
3. Place it at your counter — customers scan and start printing instantly!

Your QR URL: https://printhub.app/p/cyber-corner
```

### Step 7: Start Accepting Print Jobs

```
✅ App running in system tray (< 60 MB RAM)
✅ Printer connected and online
✅ Shop marked as "Open"
✅ QR poster displayed at counter

You're live! Customers can start scanning and printing.
```

---

## 📱 Customer Experience

### The Complete Flow (Under 2 Minutes)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. SCAN QR  │ ──▶ │  2. UPLOAD   │ ──▶ │  3. OPTIONS  │ ──▶ │  4. SUBMIT   │
│              │     │              │     │              │     │              │
│ Point phone  │     │ • PDF file   │     │ • Copies     │     │ • Enter name │
│ at counter   │     │ • Photos     │     │ • B&W/Colour │     │ • Choose UPI │
│ QR standee   │     │ • Scan pages │     │ • Duplex     │     │   or Cash    │
│              │     │              │     │ • N-up       │     │ • See total  │
│ No app       │     │ Up to 20     │     │ • Page range │     │              │
│ No login     │     │ documents    │     │ • Paper size │     │ Send to Shop │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  7. DONE!    │ ◀── │  6. PICKUP   │ ◀── │  5. TRACK    │ ◀──────────┘
│              │     │              │     │              │
│ Files are    │     │ Collect at   │     │ Live status: │
│ permanently  │     │ counter with │     │ Waiting →    │
│ deleted      │     │ pickup code  │     │ Accepted →   │
│ everywhere   │     │ e.g. "K7-42" │     │ Printing →   │
│ within 30s   │     │              │     │ Ready! ✅    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### What the Customer Sees

- **Shop Landing Page:** Shop name, logo, online/offline status, price list of enabled print types.
- **Cart:** Multi-document cart with per-document print options. Disabled options show clear tooltips ("This shop doesn't offer colour printing").
- **Live Pricing:** Sticky footer with per-document costs and running total, updating in real-time.
- **Checkout:** Name entry, UPI or pay-at-counter, final price confirmation.
- **Status Page:** Live order tracking with pickup code and payment status.
- **Privacy Notice:** "Your files are deleted right after printing" — visible throughout.

---

## 📸 Built-In Document Scanner

PrintHub includes a **professional-grade document scanner** directly in the customer web app — no separate app needed.

### Scanner Features

| Feature | How It Works |
|---|---|
| **Camera Capture** | Opens rear camera via `getUserMedia` with file-input fallback |
| **Auto Edge Detection** | Automatically proposes a quadrilateral crop around the document |
| **Manual Adjustment** | Four draggable corner handles for precise cropping |
| **Perspective Correction** | Transforms the captured image to a flat, rectangular page |
| **Enhancement Filters** | Original, Auto-enhance, Grayscale, Black & White (adaptive threshold) |
| **Multi-Page Scanning** | "Add another page" flow — all pages form one document |
| **Page Management** | Retake, delete, reorder scanned pages |
| **On-Device PDF Assembly** | Pages assembled into a single PDF on the phone before upload |

### Scanner Pipeline

```
Camera Frame (1920×1080+)
    ↓
Edge Detection (auto-propose crop)
    ↓
Perspective Transform → A4 ratio @ 200 DPI (1654×2339 px)
    ↓
Enhancement Filter (Grayscale / Adaptive Threshold for B&W)
    ↓
JPEG Encoding (q 0.7-0.8) → ~100-250 KB/page (B&W)
    ↓
Assemble into single PDF (pdf-lib) → Upload
```

---

## 🔐 Zero-Trace Privacy & Security Architecture

PrintHub's privacy model is **enforced by architecture**, not by policy. Documents physically cannot be viewed, saved, or extracted by the shopkeeper.

### Five-Layer Deletion Guarantee

| Layer | Mechanism | Timing |
|---|---|---|
| **1. Immediate** | Deletion triggered on terminal states (Printed, Rejected, Cancelled, Expired) | < 30 seconds |
| **2. Retry Queue** | Exponential backoff retries for failed delete calls | Up to ~10 retries |
| **3. Sweeper** | Finds and purges jobs past TTL or in terminal state with missing purge | Every 60 seconds |
| **4. Orphan Sweeper** | Scans bucket for objects whose jobs are missing or already purged | Every 5 minutes |
| **5. Bucket Lifecycle** | Cloud provider auto-deletes hidden/old objects | Backstop (1 day) |

### Security Measures

| Domain | Implementation |
|---|---|
| **Authentication** | Argon2id password hashing, rate-limited login, short-lived JWT (15 min) + rotating refresh tokens |
| **Anonymous Sessions** | Signed session tokens scoped to one shop, 30-minute lifetime |
| **Object Storage** | Private bucket, random keys (`jobs/<jobId>/<docId>.<ext>`), no filenames, no PII in keys |
| **Presigned URLs** | Upload: 10 min TTL. Download: 60 sec TTL, one-time, agent-device-only |
| **Upload Validation** | Magic-byte checks, encrypted PDF rejection, JS/embedded file stripping, size caps (25 MB/file) |
| **Price Integrity** | Server recomputes all prices. Client calculations are preview-only. Snapshot stored per job. |
| **Network** | TLS everywhere, HSTS, strict CORS, CSP, Helmet middleware |
| **Business App** | No view/export features, download URLs only to registered agent device, in-memory file handling |
| **Logging** | Structured logging (pino) with zero PII. Audit log for auth events and settings changes. |
| **Credential Storage** | Business tokens stored in Windows Credential Manager (not filesystem) |

### What Survives After Deletion

Only anonymized analytics metadata is retained (90-day configurable retention):

```
✅ Kept: Job code, timestamps, page/sheet counts, B&W vs colour split, price, payment state, first name
❌ Deleted: File names, storage keys, thumbnails, document content, version IDs
```

---

## 🖨️ Silent Printing Engine

### How One-Click Printing Works

```
1. Customer submits job
2. Backend creates job → pushes `job.new` event via WebSocket (< 2 seconds)
3. Desktop agent shows toast notification with job summary
4. Shopkeeper clicks "Accept"
5. Agent fetches PDFs via 60-second presigned URLs into memory
6. Pages rendered at 200 DPI (colour) or 200 DPI grayscale (B&W)
7. N-up imposition, page range, orientation, fit mode applied
8. Print job sent to Windows spooler with DEVMODE settings:
   - dmCopies, dmColor (MONOCHROME/COLOR), dmDuplex, dmPaperSize, dmOrientation
9. Spooler completion detected → status PRINTED → immediate purge triggered
10. All buffers zeroed, references dropped, memory released
```

### Print Options Supported

| Option | Values |
|---|---|
| Copies | 1–99 |
| Colour Mode | B&W (enforced monochrome even on colour printers) / Colour |
| Sides | Single-sided / Duplex (both sides) |
| Paper Size | A4, A3 (if enabled) |
| Pages per Sheet (N-up) | 1, 2, 4, 6, 9 |
| Page Range | All pages, or custom (e.g., `1-3, 5`) |
| Orientation | Auto (default), Portrait, Landscape |
| Fit Mode | Fit to page (default), Fill, Original size |

### Failure Handling

- **Printer offline/jammed** → Job moves to `FAILED_PRINT` (retryable) → Shopkeeper gets "Retry" button
- **Customer sees:** "Shop is fixing a printer issue"
- **FIFO queue:** One job prints at a time; others wait in `QUEUED`

---

## 💰 Payment System

PrintHub v1 supports **direct UPI payments** and **pay-at-counter** — with no payment gateway fees.

### UPI Flow

```
1. Server builds UPI intent URI:
   upi://pay?pa=<vpa>&pn=<shopName>&am=<amount>&cu=INR&tn=<jobCode>&tr=<jobId>

2. On mobile → Opens UPI app chooser (GPay, PhonePe, Paytm, BHIM)
   On desktop → Shows payment QR code

3. Customer taps "I've paid" → Status: CUSTOMER_CLAIMED_PAID
4. Shopkeeper confirms with one click → Status: PAID_CONFIRMED
```

### Payment States

| State | Meaning |
|---|---|
| `UNPAID` | No payment action taken |
| `CUSTOMER_CLAIMED_PAID` | Customer reports UPI payment |
| `PAID_CONFIRMED` | Shopkeeper verifies payment received |
| `PAY_AT_COUNTER` | Customer will pay cash at pickup |

### Business Controls

- **Print Before Payment** (default ON): Print immediately on accept, collect payment at counter
- **Print After Payment** (optional): Wait for payment confirmation before printing
- Dashboard shows **confirmed vs pending revenue** split

---

## 📊 Analytics & Business Intelligence

The business dashboard provides real-time insights:

### Metrics Available

| Metric | Granularity |
|---|---|
| Total Jobs | Today / Week / Month |
| Total Documents, Pages, Sheets | Today / Week / Month |
| Revenue (Confirmed vs Pending) | Today / Week / Month |
| B&W vs Colour Split | Per period |
| Average Job Value | Per period |
| Peak Hours | Hourly breakdown |
| Rejected / Expired Counts | Per period |

### Job History

- Searchable list: code, time, customer name, pages, amount, payment state, status
- **CSV Export** for accounting
- No document content stored — only anonymized job metadata

---

## 🌍 Internationalization (i18n)

PrintHub ships with **English and Hindi** from day one, with i18n architecture ready for more languages.

| Language | Coverage |
|---|---|
| 🇬🇧 English | Full UI (100+ strings) |
| 🇮🇳 Hindi (हिन्दी) | Full UI (100+ strings) |

All UI strings — from "Scan to Print" to "Your files are deleted right after printing" — are available in both languages. The customer app auto-detects language preference.

---

## 📁 Repository Structure

```
printhub-monorepo/
│
├── backend/                    # Express + TypeScript API Server
│   └── src/
│       ├── config/             # Environment and app configuration
│       ├── middleware/         # Auth, error handling, rate limiting, validation
│       ├── models/            # Mongoose schemas (Business, Job, DailyStats, RefreshToken)
│       ├── routes/            # REST endpoints (auth, business, public, agent, storage, health)
│       ├── services/          # Business logic (auth, jobs, pricing, purge, public)
│       ├── storage/           # StorageProvider interface + S3/LocalDisk implementations
│       ├── realtime/          # Socket.IO WebSocket gateway
│       ├── scripts/           # Database seeders and migrations
│       └── tests/             # API integration tests
│
├── business/                   # Tauri v2 Desktop App (Windows)
│   ├── src/                   # Next.js UI (static export)
│   │   ├── app/               # Pages: dashboard, requests, pricing, printers, settings, poster, toast
│   │   ├── components/        # Reusable UI components
│   │   └── lib/               # API client, state management
│   └── src-tauri/             # Rust core
│       └── src/main.rs        # Tray, single-instance, notifications, auto-start
│
├── customer/                   # Next.js PWA (Mobile-First)
│   └── src/
│       ├── app/               # Pages: landing (/p/[slug]), cart, checkout, job status
│       ├── components/        # DocumentCard, Header, PricingFooter, Scanner
│       │   └── scanner/       # CameraStep, CropStep, PagesStep, filters, processor
│       ├── lib/               # API client, i18n (EN/HI), PDF processor, Zustand store
│       └── ui/                # Design system components
│
├── packages/
│   ├── shared/                # @printhub/shared — Canonical types, schemas, pricing engine
│   │   └── src/
│   │       ├── constants.ts   # Print catalog, job statuses, payment states, limits
│   │       ├── types.ts       # TypeScript type definitions
│   │       ├── schemas.ts     # Zod validation schemas
│   │       ├── pricing.ts     # Deterministic pricing engine (integer paise arithmetic)
│   │       └── pricing.test.ts # Unit tests for pricing edge cases
│   └── config/                # Shared ESLint and TypeScript configurations
│
├── docs/
│   ├── decisions.md           # Architectural Decision Records
│   ├── threat-model.md        # Security architecture and threat analysis
│   ├── deployment.md          # Deployment guide and infrastructure
│   └── runbook.md             # Operations runbook (secret rotation, troubleshooting)
│
├── scripts/                   # Build and utility scripts
├── .github/workflows/         # CI (build, typecheck, test) + Desktop release pipeline
├── render.yaml                # Render.com deployment configuration
├── pnpm-workspace.yaml        # Workspace definition
└── package.json               # Root monorepo package
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **Customer Web** | Next.js 14+ (App Router), PWA, Zustand, pdf-lib, pdfjs-dist |
| **Business Desktop** | Tauri v2, Rust 2021 Edition, Next.js (static export), WebView2 |
| **Backend API** | Node.js 20+, Express, TypeScript, Socket.IO |
| **Database** | MongoDB (Mongoose ODM) |
| **Object Storage** | S3-compatible (Backblaze B2 / Cloudflare R2), presigned URLs |
| **Authentication** | Argon2id hashing, JWT (access + refresh), signed anonymous sessions |
| **Validation** | Zod schemas (shared across all apps) |
| **Logging** | Pino (structured, zero-PII) |
| **Package Manager** | pnpm 9.x (workspace monorepo) |
| **CI/CD** | GitHub Actions (lint, typecheck, test, build, desktop release) |
| **Deployment** | Render.com (backend), Vercel/static (customer), NSIS installer (desktop) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0, < 23.0.0
- **pnpm** 9.15.4+
- **MongoDB** (local or Atlas)
- **Rust** toolchain (for the desktop app)
- **Windows** (for desktop app development/testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/M-ayank2005/PrintHub.git
cd PrintHub

# Install all dependencies
pnpm install

# Build the shared package first (required by all other packages)
pnpm build:shared
```

### Development

```bash
# Start the backend API server (with hot reload)
pnpm dev:backend

# Start the customer web app (with hot reload)
pnpm dev:customer

# Start the business desktop app UI (with hot reload)
pnpm dev:business
```

### Build

```bash
# Build everything (shared → backend → customer)
pnpm build

# Build individual packages
pnpm build:shared
pnpm build:backend
pnpm build:customer
pnpm build:business
```

### Testing

```bash
# Run all tests (shared + backend)
pnpm test

# Type-check all packages
pnpm typecheck
```

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | API server port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/printhub` |
| `JWT_ACCESS_SECRET` | JWT access token signing secret | `<random-secret>` |
| `JWT_REFRESH_SECRET` | JWT refresh token signing secret | `<random-secret>` |
| `JWT_SESSION_SECRET` | Anonymous session token secret | `<random-secret>` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://localhost:3001` |
| `STORAGE_DRIVER` | Storage backend (`s3` or `local`) | `local` |
| `S3_ENDPOINT` | S3-compatible endpoint | `https://s3.us-west-004.backblazeb2.com` |
| `S3_REGION` | S3 region | `us-west-004` |
| `S3_BUCKET` | Bucket name | `printhub-docs` |
| `S3_ACCESS_KEY_ID` | S3 access key | `<key>` |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | `<secret>` |

### Customer App (`customer/.env`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:4000` |

### Business App (`business/.env`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:4000` |

---

## 🔄 CI/CD

### Continuous Integration (`ci.yml`)

Runs on every push/PR to `main`:

```
✅ Checkout → pnpm install (frozen lockfile)
✅ Build shared package
✅ TypeScript type-checking (all packages)
✅ Unit tests (shared + backend)
✅ Build backend
✅ Build customer app
✅ Build business app
```

### Desktop Release (`release-desktop.yml`)

Automated Windows desktop installer builds with:
- Tauri v2 build pipeline
- NSIS installer generation
- Code signing (when configured)
- Auto-update artifact publishing

---

## 🌐 Deployment

### Backend

Configured for **Render.com** (`render.yaml`):
- Web service with health check at `/healthz`
- Auto-deploy on push
- Environment variables managed via Render dashboard

### Customer Web App

Deploy as a static site or SSR app on **Vercel**, **Cloudflare Pages**, or any static host.

### Desktop App

Distributed as a **Windows NSIS installer**:
- Per-user install (no admin required)
- WebView2 bootstrapper included
- Auto-update via Tauri updater with signature verification

---

## 🗺️ Roadmap

### ✅ Shipped (v1)

- [x] Business account creation and onboarding
- [x] Configurable pricing catalog (A4/A3, B&W/Colour, Single/Duplex)
- [x] QR code generation and printable poster export
- [x] Customer PDF upload with validation
- [x] Customer image upload (JPG, PNG, WebP, HEIC)
- [x] Built-in camera document scanner with edge detection
- [x] Per-document print options (copies, colour, duplex, N-up, page range)
- [x] Live server-validated pricing
- [x] Real-time WebSocket job delivery (< 2s toast latency)
- [x] Silent one-click printing
- [x] Printer enumeration, selection, and capability detection
- [x] UPI payment flow + pay-at-counter
- [x] Zero-trace privacy with 5-layer deletion guarantee
- [x] Business analytics dashboard
- [x] English + Hindi i18n
- [x] System tray operation with < 60 MB idle memory
- [x] CI/CD pipeline with automated builds and tests

### 🔜 Planned (v2+)

- [ ] Payment gateway integration (Razorpay / Cashfree) for automatic UPI verification
- [ ] End-to-end encryption (AES-GCM, client-generated keys per job)
- [ ] Multiple desktop agents / printers per business
- [ ] Word / Excel / PowerPoint upload (LibreOffice server-side conversion)
- [ ] Customer accounts and order history
- [ ] Mac and Linux desktop app
- [ ] Native mobile apps (iOS / Android)
- [ ] Multi-staff roles and permissions
- [ ] Cloudflare Turnstile for anti-abuse
- [ ] Advanced analytics with trend graphs

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  <strong>Built with ❤️ for Indian print shops</strong><br/>
  <em>Eliminating WhatsApp file sharing, one QR scan at a time.</em>
</p>
