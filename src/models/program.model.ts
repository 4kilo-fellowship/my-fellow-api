import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProgramCoordinates {
  lat: number;
  lng: number;
}

export interface IProgram extends Document {
  title: string;
  description: string;
  day: string;
  time: string;
  category: string;
  location: string;
  coordinates?: IProgramCoordinates;
  image?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProgramSchema = new Schema<IProgram>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    day: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    image: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

ProgramSchema.index({ title: 1 });
ProgramSchema.index({ category: 1 });

export const ProgramModel: Model<IProgram> =
  mongoose.models.Program || mongoose.model<IProgram>("Program", ProgramSchema);

export default ProgramModel;
