import mongoose, { Document, Model, Schema } from "mongoose";

export type DevotionType = "text" | "voice";

export interface IDevotion extends Document {
  title: string;
  author: string;
  authorId?: mongoose.Types.ObjectId | string;
  authorAvatar?: string;
  authorRole?: string;
  authorUsername?: string;
  date: string;
  views: number;
  likes: number;
  image: string;
  imagePublicId?: string;
  type: DevotionType;
  duration?: string;
  content?: string;

  // Voice devotion fields (voice audio + mandatory caption/transcript)
  audioUrl?: string;
  audioPublicId?: string;
  caption?: string;

  // Shared metadata
  tags?: string[];
  featured?: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const DevotionSchema = new Schema<IDevotion>(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
    authorAvatar: { type: String, trim: true },
    authorRole: { type: String, trim: true },
    authorUsername: { type: String, trim: true },
    date: { type: String, required: true },
    views: { type: Number, required: true, default: 0 },
    likes: { type: Number, required: true, default: 0 },
    image: { type: String, required: true },
    imagePublicId: { type: String },
    type: {
      type: String,
      enum: ["text", "voice"],
      required: true,
    },
    duration: { type: String },

    // Text & Voice devotion content / caption
    content: { type: String },

    // Voice & Audio
    audioUrl: { type: String },
    audioPublicId: { type: String },
    caption: { type: String },

    // Shared
    tags: [{ type: String, trim: true }],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

DevotionSchema.index({ type: 1, createdAt: -1 });
DevotionSchema.index({ authorId: 1 });
DevotionSchema.index({ featured: 1 });
DevotionSchema.index({ tags: 1 });

export const DevotionModel: Model<IDevotion> =
  mongoose.models.Devotion ||
  mongoose.model<IDevotion>("Devotion", DevotionSchema);

export default DevotionModel;
