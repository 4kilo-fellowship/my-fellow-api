import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOtpRecord extends Document {
  phoneNumber: string;
  codeHash: string;
  purpose: "signup" | "reset-password";
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  verifiedAt?: Date | null;
  verificationToken?: string | null;
  createdAt: Date;
}

const OtpRecordSchema = new Schema<IOtpRecord>(
  {
    phoneNumber: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["signup", "reset-password"],
      default: "signup",
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Auto-delete on expiry via TTL index
    verifiedAt: { type: Date, default: null },
    verificationToken: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

export const OtpRecordModel: Model<IOtpRecord> =
  mongoose.models.OtpRecord ||
  mongoose.model<IOtpRecord>("OtpRecord", OtpRecordSchema);

export default OtpRecordModel;
