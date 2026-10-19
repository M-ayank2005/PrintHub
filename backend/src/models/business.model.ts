import mongoose, { Schema, Document } from 'mongoose';
import { DEFAULT_PRICING, PRINT_CATALOG_KEYS } from '@printhub/shared';

export interface IPrinterCap {
  name: string;
  isDefault: boolean;
  isOnline: boolean;
  isColor: boolean;
  isDuplex: boolean;
  paperSizes: string[];
}

export interface IBusinessAgent {
  deviceId: string;
  deviceName: string;
  lastSeenAt: Date;
  printerCaps: IPrinterCap[];
}

export interface IBusiness extends Document {
  email: string;
  passwordHash: string;
  shopName: string;
  slug: string;
  upiId?: string;
  payeeName?: string;
  isOpen: boolean;
  acceptPaused: boolean;
  printBeforePayment: boolean;
  pricing: Record<string, { enabled: boolean; pricePaise: number }>;
  extras?: {
    scanFeePerPage?: number;
    minimumOrder?: number;
  };
  agent?: IBusinessAgent;
  createdAt: Date;
  updatedAt: Date;
}

const PrinterCapSchema = new Schema<IPrinterCap>(
  {
    name: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: true },
    isColor: { type: Boolean, default: false },
    isDuplex: { type: Boolean, default: false },
    paperSizes: { type: [String], default: ['A4'] },
  },
  { _id: false }
);

const BusinessAgentSchema = new Schema<IBusinessAgent>(
  {
    deviceId: { type: String, required: true },
    deviceName: { type: String, required: true },
    lastSeenAt: { type: Date, default: Date.now },
    printerCaps: { type: [PrinterCapSchema], default: [] },
  },
  { _id: false }
);

const BusinessSchema = new Schema<IBusiness>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    shopName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    upiId: { type: String, trim: true },
    payeeName: { type: String, trim: true },
    isOpen: { type: Boolean, default: true },
    acceptPaused: { type: Boolean, default: false },
    printBeforePayment: { type: Boolean, default: true },
    pricing: {
      type: Schema.Types.Mixed,
      default: () => ({ ...DEFAULT_PRICING }),
    },
    extras: {
      scanFeePerPage: { type: Number, default: 0 },
      minimumOrder: { type: Number, default: 0 },
    },
    agent: { type: BusinessAgentSchema },
  },
  { timestamps: true }
);

export const BusinessModel = mongoose.model<IBusiness>('Business', BusinessSchema);
