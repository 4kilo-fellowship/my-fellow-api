import mongoose, { Document, Model, Schema } from "mongoose";

export type OtpPurpose = "signup" | "update-phone";

export interface IOtpVerification {
  phoneNumber: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumed: boolean;
  lastSentAt: Date | null;
  sendCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOtpVerificationDocument extends IOtpVerification, Document {}

const OtpVerificationSchema = new Schema<IOtpVerificationDocument>(
  {
    phoneNumber: { type: String, required: true, trim: true, index: true },
    purpose: { type: String, enum: ["signup", "update-phone"], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    lastSentAt: { type: Date, default: null },
    sendCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

OtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpVerificationModel: Model<IOtpVerificationDocument> =
  mongoose.models.OtpVerification ||
  mongoose.model<IOtpVerificationDocument>(
    "OtpVerification",
    OtpVerificationSchema,
  );
