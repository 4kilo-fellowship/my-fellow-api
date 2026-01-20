import mongoose, { Document, Schema } from "mongoose";

export interface IEvent extends Document {
  title: string;
  shortDescription: string;
  fullDescription?: string;
  startDate: Date;
  endDate: Date;
  buttonText?: string;
  imageUrl: string;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    buttonText: { type: String, trim: true },
    imageUrl: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const EventModel = mongoose.model<IEvent>("Event", EventSchema);

export default EventModel;
