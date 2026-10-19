import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  JOB_STATUSES,
  JobStatus,
  PAYMENT_STATES,
  PaymentState,
  PAYMENT_MODES,
  PaymentMode,
  DOCUMENT_KINDS,
  DocumentKind,
  DocumentOptions,
  JobTotals,
  PriceSnapshot,
} from '@printhub/shared';

export interface IJobDoc {
  docId: string;
  kind: DocumentKind;
  storageKey?: string;
  versionId?: string;
  sizeBytes: number;
  pages: number;
  options: DocumentOptions;
  priceSubtotalPaise: number;
}

export interface IJob extends Document {
  code: string;
  businessId: Types.ObjectId;
  sessionId: string;
  status: JobStatus;
  customerName: string;
  customerPhone?: string;
  paymentMode: PaymentMode;
  paymentState: PaymentState;
  snapshot: PriceSnapshot;
  docs: IJobDoc[];
  totals: JobTotals;
  expiresAt: Date;
  purgeAfter: Date;
  purgedAt?: Date;
  printedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobDocSchema = new Schema<IJobDoc>(
  {
    docId: { type: String, required: true },
    kind: { type: String, enum: DOCUMENT_KINDS, required: true },
    storageKey: { type: String },
    versionId: { type: String },
    sizeBytes: { type: Number, required: true },
    pages: { type: Number, required: true },
    options: { type: Schema.Types.Mixed, required: true },
    priceSubtotalPaise: { type: Number, required: true },
  },
  { _id: false }
);

const JobSchema = new Schema<IJob>(
  {
    code: { type: String, required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    status: { type: String, enum: JOB_STATUSES, default: 'SUBMITTED', index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    paymentMode: { type: String, enum: PAYMENT_MODES, default: 'COUNTER' },
    paymentState: { type: String, enum: PAYMENT_STATES, default: 'UNPAID' },
    snapshot: { type: Schema.Types.Mixed, required: true },
    docs: { type: [JobDocSchema], required: true },
    totals: {
      documents: { type: Number, required: true },
      pages: { type: Number, required: true },
      sheets: { type: Number, required: true },
      bwSheets: { type: Number, required: true },
      colorSheets: { type: Number, required: true },
      pricePaise: { type: Number, required: true },
    },
    expiresAt: { type: Date, required: true, index: true },
    purgeAfter: { type: Date, required: true },
    purgedAt: { type: Date },
    printedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound indexes for querying and sweeper performance
JobSchema.index({ businessId: 1, createdAt: -1 });
JobSchema.index({ status: 1, expiresAt: 1 });
JobSchema.index({ status: 1, purgedAt: 1 });

export const JobModel = mongoose.model<IJob>('Job', JobSchema);
