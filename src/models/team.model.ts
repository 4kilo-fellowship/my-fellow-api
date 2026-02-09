import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITeamLeader {
  name: string;
  role: string;
  imageUrl?: string;
  telegram?: string;
  phone?: string;
}

export interface ITeamCoordinates {
  lat: number;
  lng: number;
}

export interface ITeam extends Document {
  name: string;
  icon?: string;
  color?: string;
  members: number;
  description: string;
  about?: string;
  meetingDay?: string;
  time?: string;
  category?: string;
  location?: string;
  coordinates?: ITeamCoordinates;
  imageUrl?: string;
  leader?: ITeamLeader;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, trim: true },
    color: { type: String, trim: true },
    members: { type: Number, default: 0 },
    description: { type: String, required: true, trim: true },
    about: { type: String, trim: true },
    meetingDay: { type: String, trim: true },
    time: { type: String, trim: true },
    category: { type: String, trim: true },
    location: { type: String, trim: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    imageUrl: { type: String, trim: true },
    leader: {
      name: { type: String, required: true },
      role: { type: String, required: true },
      imageUrl: { type: String },
      telegram: { type: String },
      phone: { type: String },
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

TeamSchema.index({ name: 1 });
TeamSchema.index({ category: 1 });

export const TeamModel: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default TeamModel;
