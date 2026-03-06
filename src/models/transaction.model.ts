import mongoose, { Schema, Document, Model } from "mongoose";

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface ITransaction {
  userId: mongoose.Types.ObjectId;
  tx_ref: string;
  amount: number;
  reason: string;
  status: TransactionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITransactionDocument extends ITransaction, Document {}

const TransactionSchema = new Schema<ITransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tx_ref: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: "donation" },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
  },
  { timestamps: true },
);

export const TransactionModel: Model<ITransactionDocument> =
  mongoose.models.Transaction ||
  mongoose.model<ITransactionDocument>("Transaction", TransactionSchema);
