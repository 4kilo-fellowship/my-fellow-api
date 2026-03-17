import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEvent extends Document {
  title: string;
  shortDescription: string;
  fullDescription?: string;
  startDate: Date;
  endDate: Date;
  buttonText?: string;
  imageUrl: string;
  isDeleted: boolean;
  registrationLimit?: number | null;
  registrationsCount: number;
  scheduledAt?: Date | null;
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
    isDeleted: { type: Boolean, default: false },
    registrationLimit: { type: Number, default: null },
    registrationsCount: { type: Number, default: 0 },
    scheduledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const EventModel: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);

export default EventModel;
