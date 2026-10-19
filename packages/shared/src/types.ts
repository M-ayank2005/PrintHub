import {
  PrintCatalogKey,
  JobStatus,
  PaymentState,
  PaymentMode,
  DocumentKind,
  ColorMode,
  Sides,
  PaperSize,
  PagesPerSheet,
  Orientation,
  FitMode,
} from './constants';
import { DocumentOptions, BusinessPricing } from './schemas';

export interface DocPriceBreakdown {
  docId: string;
  selectedPages: number;
  printedSides: number;
  printedSheets: number;
  catalogKey: PrintCatalogKey;
  unitPricePaise: number;
  extrasPaise: number;
  subtotalPaise: number;
}

export interface JobTotals {
  documents: number;
  pages: number;
  sheets: number;
  bwSheets: number;
  colorSheets: number;
  pricePaise: number;
}

export interface PriceSnapshot {
  pricing: BusinessPricing['pricing'];
  extras?: BusinessPricing['extras'];
  calculatedAt: string;
}

export interface JobDocRecord {
  docId: string;
  kind: DocumentKind;
  storageKey?: string;
  versionId?: string;
  sizeBytes: number;
  pages: number;
  options: DocumentOptions;
  priceSubtotalPaise: number;
}

export interface JobRecord {
  id: string;
  code: string;
  businessId: string;
  sessionId: string;
  status: JobStatus;
  customerName: string;
  customerPhone?: string;
  paymentMode: PaymentMode;
  paymentState: PaymentState;
  snapshot: PriceSnapshot;
  docs: JobDocRecord[];
  totals: JobTotals;
  expiresAt: Date;
  purgeAfter: Date;
  purgedAt?: Date;
  printedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrinterCapability {
  name: string;
  isDefault: boolean;
  isOnline: boolean;
  isColor: boolean;
  isDuplex: boolean;
  paperSizes: string[];
}

export interface BusinessAgentInfo {
  deviceId: string;
  deviceName: string;
  lastSeenAt: Date;
  printerCaps: PrinterCapability[];
}

export interface BusinessRecord {
  id: string;
  email: string;
  shopName: string;
  slug: string;
  upiId?: string;
  payeeName?: string;
  isOpen: boolean;
  acceptPaused: boolean;
  printBeforePayment: boolean;
  pricing: BusinessPricing['pricing'];
  extras?: BusinessPricing['extras'];
  agent?: BusinessAgentInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

// Socket.io Events
export interface JobNewEvent {
  job: {
    id: string;
    code: string;
    customerName: string;
    paymentMode: PaymentMode;
    paymentState: PaymentState;
    totals: JobTotals;
    docsCount: number;
    createdAt: string;
    expiresAt: string;
  };
}

export interface JobUpdatedEvent {
  jobId: string;
  status: JobStatus;
  paymentState: PaymentState;
  reason?: string;
  timestamp: string;
}
