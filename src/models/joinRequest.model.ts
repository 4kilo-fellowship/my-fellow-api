import mongoose, { Document, Model, Schema } from "mongoose";

export interface IJoinRequest extends Document {
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  fullName: string;
  phoneNumber: string;
  profileImage?: string;
  pastTeam?: string;
  department: string;
  year: string;
  telegramHandle: string;
  status: "pending" | "approved" | "rejected";
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    profileImage: { type: String },
    pastTeam: { type: String },
    department: { type: String, required: true },
    year: { type: String, required: true },
    telegramHandle: { type: String, required: true },
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
