import mongoose, { Schema, Document, Model } from "mongoose";

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface ITransaction {
  userId?: mongoose.Types.ObjectId;
  tx_ref: string;
  amount: number;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  reason: string;
  status: TransactionStatus;
  meta?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITransactionDocument extends ITransaction, Document {}

const TransactionSchema = new Schema<ITransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    tx_ref: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "ETB" },
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String },
    reason: { type: String, default: "gift" },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const TransactionModel: Model<ITransactionDocument> =
  mongoose.models.Transaction ||
  mongoose.model<ITransactionDocument>("Transaction", TransactionSchema);
