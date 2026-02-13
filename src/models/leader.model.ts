import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILeader extends Document {
  name: string;
  role: string;
  bio: string;
  phoneNumber: string;
  telegram: string;
  isVerified: boolean;
  image: string;
  type: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderSchema = new Schema<ILeader>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    bio: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    telegram: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: false },
    image: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

LeaderSchema.index({ name: 1 });
LeaderSchema.index({ type: 1 });

export const LeaderModel: Model<ILeader> =
  mongoose.models.Leader || mongoose.model<ILeader>("Leader", LeaderSchema);

export default LeaderModel;
