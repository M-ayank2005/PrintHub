import { z } from 'zod';
import {
  PRINT_CATALOG_KEYS,
  DOCUMENT_KINDS,
  COLOR_MODES,
  SIDES,
  PAPER_SIZES,
  PAGES_PER_SHEET_OPTIONS,
  ORIENTATIONS,
  FIT_MODES,
  PAYMENT_MODES,
  LIMITS,
} from './constants';

export const UPI_ID_REGEX = /^[\w.\-]+@[\w.\-]+$/;

export const DocumentOptionsSchema = z.object({
  copies: z.number().int().min(1).max(99).default(1),
  colorMode: z.enum(COLOR_MODES).default('BW'),
  sides: z.enum(SIDES).default('SINGLE'),
  paperSize: z.enum(PAPER_SIZES).default('A4'),
  pagesPerSheet: z.coerce
    .number()
    .pipe(z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(6), z.literal(9)]))
    .default(1),
  pageRange: z.string().trim().max(100).optional(),
  orientation: z.enum(ORIENTATIONS).default('AUTO'),
  fitMode: z.enum(FIT_MODES).default('FIT').optional(),
});

export type DocumentOptions = z.infer<typeof DocumentOptionsSchema>;

export const CatalogItemPricingSchema = z.object({
  enabled: z.boolean(),
  pricePaise: z.number().int().min(1, 'Price must be greater than zero').max(50000, 'Price exceeds maximum allowed'),
});

export const BusinessPricingSchema = z.object({
  pricing: z.record(z.enum(PRINT_CATALOG_KEYS), CatalogItemPricingSchema),
  extras: z.object({
    scanFeePerPage: z.number().int().min(0).max(10000).optional(),
    minimumOrder: z.number().int().min(0).max(50000).optional(),
  }).optional(),
});

export type BusinessPricing = z.infer<typeof BusinessPricingSchema>;

export const BusinessSignupSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').max(100).trim(),
});

export const BusinessLoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const BusinessProfileUpdateSchema = z.object({
  shopName: z.string().min(2).max(100).trim().optional(),
  address: z.string().max(250).trim().optional(),
  upiId: z.string().regex(UPI_ID_REGEX, 'Invalid UPI ID format (e.g. name@bank)').optional().nullable(),
  payeeName: z.string().max(100).trim().optional(),
  isOpen: z.boolean().optional(),
  acceptPaused: z.boolean().optional(),
  printBeforePayment: z.boolean().optional(),
});

export const PrinterCapabilitySchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().default(false),
  isOnline: z.boolean().default(true),
  isColor: z.boolean().default(false),
  isDuplex: z.boolean().default(false),
  paperSizes: z.array(z.string()).default(['A4']),
});

export const AgentRegisterSchema = z.object({
  deviceId: z.string().min(1).max(100),
  deviceName: z.string().min(1).max(100),
  forceTakeover: z.boolean().default(false),
  printerCaps: z.array(PrinterCapabilitySchema).default([]),
});

export const PublicSessionCreateSchema = z.object({
  slug: z.string().min(1).max(50),
});

export const UploadPresignRequestSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(LIMITS.MAX_FILE_SIZE_BYTES),
});

export const QuoteDocItemSchema = z.object({
  docId: z.string().min(1),
  kind: z.enum(DOCUMENT_KINDS).default('PDF'),
  totalPages: z.number().int().min(1).default(1),
  options: DocumentOptionsSchema,
});

export const QuoteRequestSchema = z.object({
  docs: z.array(QuoteDocItemSchema).min(1).max(LIMITS.MAX_DOCUMENTS_PER_JOB),
});

export const SubmitDocItemSchema = z.object({
  docId: z.string().min(1),
  kind: z.enum(DOCUMENT_KINDS).default('PDF'),
  storageKey: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  pages: z.number().int().min(1),
  options: DocumentOptionsSchema,
});

export const JobSubmitSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(50).trim(),
  customerPhone: z.string().max(20).trim().optional(),
  paymentMode: z.enum(PAYMENT_MODES).default('COUNTER'),
  expectedTotalPaise: z.number().int().nonnegative(),
  docs: z.array(SubmitDocItemSchema).min(1).max(LIMITS.MAX_DOCUMENTS_PER_JOB),
});

export const AgentJobStatusUpdateSchema = z.object({
  status: z.enum(['PRINTING', 'PRINTED', 'FAILED_PRINT']),
  reason: z.string().max(250).optional(),
});
