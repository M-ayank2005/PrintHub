# Security Architecture and Threat Model

This document outlines the security architecture, threat model, and mitigation strategies for the QR Print Platform.

---

## 1. System Overview and Trust Boundaries

The system is composed of:
1. **Customer Web Client (PWA)**: Untrusted client running on customer mobile devices. No login credentials; identified via signed anonymous session tokens scoped to a single shop.
2. **Backblaze B2 / S3 Object Storage**: Private, temporary storage bucket with no public read permissions.
3. **Backend API (Node.js/Express)**: Trusted core orchestrating job metadata, validating upload constraints, issuing short-lived presigned URLs, and tracking state.
4. **Desktop Agent (Tauri v2 / Rust)**: Authenticated business desktop running on the print shop PC. Has Windows spooler access and a persistent WebSocket connection to the API.

---

## 2. Threat Analysis and Mitigations

| Threat | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **Shopkeeper snooping on customer documents** | High | The desktop app contains no UI, view, export, or save mechanisms for customer files. Files are streamed directly to memory/protected temp files for printing and unlinked immediately. Presigned download URLs are one-time use with a 60-second expiration. |
| **Leaked or guessed storage URLs** | High | Bucket is completely private. Object keys are cryptographically random UUIDs (`jobs/<jobId>/<docId>.<ext>`) with no original filenames or PII. Presigned upload URLs expire in 10 minutes; presigned download URLs expire in 60 seconds. |
| **Malicious or exploit-laden PDFs** | High | Client and server magic-byte verification (must match `%PDF-`). PDFs with embedded JavaScript, launch actions, or embedded files are rejected during confirmation. Renderers operate in sandboxed or isolated memory. File size is capped (default 25 MB/file, max 200 pages total). |
| **Tampered print pricing** | Medium | The client price calculations are previews only. The server recomputes prices authoritatively on job submission using canonical price tables stored in database. Any mismatch rejects the request. |
| **Data lingering after print or cancellation** | High | Multi-layered guaranteed purge:<br>1. Immediate deletion triggered upon terminal states (`PRINTED`, `REJECTED`, `CANCELLED`, `EXPIRED`).<br>2. Retry queue with exponential backoff for failed delete calls.<br>3. Periodic sweeper worker (every 60s) targeting jobs past TTL (max 10 minutes).<br>4. Orphan sweeper (every 5m) matching bucket objects against active jobs.<br>5. B2 bucket lifecycle rule as the ultimate backstop. |
| **Account takeover of business accounts** | High | Passwords hashed using Argon2id. Rate-limited authentication endpoints (`express-rate-limit`). Short-lived JWT access tokens (15 mins) and rotating refresh tokens securely stored in Windows Credential Manager. |
| **Spam / Denial of Service via QR code** | Medium | Per-IP and per-shop rate limiting. Max 3 active pending jobs per anonymous session. Business owner can pause incoming requests instantly with one click. |
| **Physical QR poster swap at shop** | Medium | Customer web app prominently renders the verified shop name, address, and UPI payee display name on the landing page and checkout screen. |

---

## 3. Residual Risks and Acknowledged Limitations

- **Local Windows Spooler Files**: Print jobs sent via the Windows Spooler may momentarily generate `.SPL` spool files managed by Windows Print Spooler (`spoolsv.exe`). These files are OS-protected and deleted automatically when printing completes. The app minimizes disk presence by rendering and streaming directly to printer Device Contexts.
