import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWriterRequest extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  phoneNumber: string;
  telegramHandle: string;
  department?: string;
  year?: string;
  sampleTopic: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WriterRequestSchema = new Schema<IWriterRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    telegramHandle: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    year: { type: String, trim: true },
    sampleTopic: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNotes: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

WriterRequestSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);
WriterRequestSchema.index({ status: 1, createdAt: -1 });

export const WriterRequestModel: Model<IWriterRequest> =
  mongoose.models.WriterRequest ||
  mongoose.model<IWriterRequest>("WriterRequest", WriterRequestSchema);

export default WriterRequestModel;
