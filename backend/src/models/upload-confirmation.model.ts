import mongoose, { Schema, Document } from 'mongoose';

export interface IUploadConfirmation extends Document {
  storageKey: string;
  sessionId: string;
  kind: string;
  sizeBytes: number;
  pages: number;
  versionId?: string;
  createdAt: Date;
}

const UploadConfirmationSchema = new Schema<IUploadConfirmation>(
  {
    storageKey: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true, index: true },
    kind: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    pages: { type: Number, required: true },
    versionId: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 7200 }, // Expire after 2 hours
  },
  { timestamps: false }
);

export const UploadConfirmationModel = mongoose.model<IUploadConfirmation>(
  'UploadConfirmation',
  UploadConfirmationSchema
);
