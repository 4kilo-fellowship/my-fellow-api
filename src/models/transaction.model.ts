import mongoose, { Schema, Document, Model } from "mongoose";

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface ITransaction {
  userId?: mongoose.Types.ObjectId;
  fullName: string;
  phoneNumber: string;
  team?: string | null;
  department?: string | null;
  yearOfStudy?: string | null;
  telegramUserName?: string | null;
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
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    team: { type: String, default: null },
    department: { type: String, default: null },
    yearOfStudy: { type: String, default: null },
    telegramUserName: { type: String, default: null },
    tx_ref: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: "gift" },
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
