import mongoose, { Document, Model, Schema } from "mongoose";

export interface IJoinRequest extends Document {
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    message: { type: String, trim: true },
  },
  { timestamps: true },
);

// Prevent duplicate join requests for the same team if one is already pending
JoinRequestSchema.index(
  { userId: 1, teamId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);

export const JoinRequestModel: Model<IJoinRequest> =
  mongoose.models.JoinRequest ||
  mongoose.model<IJoinRequest>("JoinRequest", JoinRequestSchema);

export default JoinRequestModel;
