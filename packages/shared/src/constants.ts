export const PRINT_CATALOG_KEYS = [
  'A4_BW_SINGLE',
  'A4_COLOR_SINGLE',
  'A4_BW_DOUBLE',
  'A4_COLOR_DOUBLE',
  'A3_BW_SINGLE',
  'A3_COLOR_SINGLE',
] as const;

export type PrintCatalogKey = (typeof PRINT_CATALOG_KEYS)[number];

export const DEFAULT_PRICING: Record<PrintCatalogKey, { enabled: boolean; pricePaise: number }> = {
  A4_BW_SINGLE: { enabled: true, pricePaise: 200 },    // ₹2.00 per side
  A4_COLOR_SINGLE: { enabled: true, pricePaise: 1000 }, // ₹10.00 per side
  A4_BW_DOUBLE: { enabled: true, pricePaise: 300 },     // ₹3.00 per sheet (both sides)
  A4_COLOR_DOUBLE: { enabled: true, pricePaise: 1800 }, // ₹18.00 per sheet (both sides)
  A3_BW_SINGLE: { enabled: false, pricePaise: 500 },    // ₹5.00 per side
  A3_COLOR_SINGLE: { enabled: false, pricePaise: 2000 },// ₹20.00 per side
};

export const JOB_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'ACCEPTED',
  'QUEUED',
  'PRINTING',
  'PRINTED',
  'FAILED_PRINT',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'PURGED',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  'PRINTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'PURGED',
] as const;

export const PAYMENT_STATES = [
  'UNPAID',
  'CUSTOMER_CLAIMED_PAID',
  'PAID_CONFIRMED',
  'PAY_AT_COUNTER',
] as const;

export type PaymentState = (typeof PAYMENT_STATES)[number];

export const PAYMENT_MODES = ['UPI', 'COUNTER'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const DOCUMENT_KINDS = ['PDF', 'IMAGE', 'SCAN'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const COLOR_MODES = ['BW', 'COLOR'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const SIDES = ['SINGLE', 'DOUBLE'] as const;
export type Sides = (typeof SIDES)[number];

export const PAPER_SIZES = ['A4', 'A3'] as const;
export type PaperSize = (typeof PAPER_SIZES)[number];

export const PAGES_PER_SHEET_OPTIONS = [1, 2, 4, 6, 9] as const;
export type PagesPerSheet = (typeof PAGES_PER_SHEET_OPTIONS)[number];

export const ORIENTATIONS = ['AUTO', 'PORTRAIT', 'LANDSCAPE'] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

export const FIT_MODES = ['FIT', 'FILL', 'ORIGINAL'] as const;
export type FitMode = (typeof FIT_MODES)[number];

export const LIMITS = {
  MAX_DOCUMENTS_PER_JOB: 20,
  MAX_PAGES_PER_JOB: 200,
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  UPLOAD_PRESIGN_TTL_SEC: 600, // 10 minutes
  DOWNLOAD_PRESIGN_TTL_SEC: 60, // 60 seconds
  PURGE_TIMEOUT_SEC: 30, // 30 seconds after terminal state
  MAX_JOB_TTL_MINUTES: 10,
  ANONYMOUS_SESSION_TTL_MINUTES: 30,
  ACCESS_TOKEN_TTL_MINUTES: 15,
  REFRESH_TOKEN_TTL_DAYS: 30,
} as const;
