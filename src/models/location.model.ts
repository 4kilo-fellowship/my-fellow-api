import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface ILocation extends Document {
  name: string;
  address: string;
  image: string;
  coordinates: ILocationCoordinates;
  serviceTimes: string[];
  googleMapsUrl: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    serviceTimes: [{ type: String, required: true, trim: true }],
    googleMapsUrl: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

LocationSchema.index({ name: 1 });

export const LocationModel: Model<ILocation> =
  mongoose.models.Location ||
  mongoose.model<ILocation>("Location", LocationSchema);

export default LocationModel;
