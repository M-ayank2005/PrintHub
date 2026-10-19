import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDailyStats extends Document {
  businessId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  jobs: number;
  docs: number;
  pages: number;
  sheets: number;
  bwSheets: number;
  colorSheets: number;
  revenueConfirmedPaise: number;
  revenuePendingPaise: number;
  rejected: number;
  expired: number;
  hourly: number[]; // 24 slots
}

const DailyStatsSchema = new Schema<IDailyStats>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    date: { type: String, required: true },
    jobs: { type: Number, default: 0 },
    docs: { type: Number, default: 0 },
    pages: { type: Number, default: 0 },
    sheets: { type: Number, default: 0 },
    bwSheets: { type: Number, default: 0 },
    colorSheets: { type: Number, default: 0 },
    revenueConfirmedPaise: { type: Number, default: 0 },
    revenuePendingPaise: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    expired: { type: Number, default: 0 },
    hourly: { type: [Number], default: () => new Array(24).fill(0) },
  },
  { timestamps: true }
);

DailyStatsSchema.index({ businessId: 1, date: 1 }, { unique: true });

export const DailyStatsModel = mongoose.model<IDailyStats>('DailyStats', DailyStatsSchema);
