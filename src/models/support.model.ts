import mongoose, { Document, Schema } from "mongoose";

export interface ISupportTicket extends Document {
  userId: string;
  message: string;
  imageUrl?: string;
  status: "pending" | "resolved" | "in-progress";
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    message: { type: String, required: true },
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["pending", "resolved", "in-progress"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const SupportTicket = mongoose.model<ISupportTicket>(
  "SupportTicket",
  SupportTicketSchema,
);
