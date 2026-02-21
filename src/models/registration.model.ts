import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRegistration extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

RegistrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const RegistrationModel: Model<IRegistration> =
  mongoose.models.Registration ||
  mongoose.model<IRegistration>("Registration", RegistrationSchema);

export default RegistrationModel;
