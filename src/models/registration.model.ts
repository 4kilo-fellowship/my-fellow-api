import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRegistration extends Document {
  fullName: string;
  phoneNumber: string;
  team?: string;
  department: string;
  yearOfStudy: string | number;
  telegramUserName?: string;
  eventTitle: string;
  createdAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, unique: true, trim: true },
    team: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    yearOfStudy: { type: Schema.Types.Mixed, required: true },
    telegramUserName: { type: String, trim: true },
    eventTitle: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const RegistrationModel: Model<IRegistration> =
  mongoose.models.Registration ||
  mongoose.model<IRegistration>("Registration", RegistrationSchema);

export default RegistrationModel;
