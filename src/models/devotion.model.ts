import mongoose, { Document, Model, Schema } from "mongoose";

export type DevotionType = "text" | "voice" | "pdf" | "book";

export interface IDevotion extends Document {
  title: string;
  author: string;
  date: string;
  views: number;
  likes: number;
  image: string;
  imagePublicId?: string;
  type: DevotionType;
  duration?: string;
  content?: string;

  // Voice devotion fields
  audioUrl?: string;
  audioPublicId?: string;
  caption?: string; // Text description

  // PDF devotion fields
  pdfUrl?: string;
  pdfPublicId?: string;
  pageCount?: number;

  // Book devotion fields
  bookUrl?: string;
  bookPublicId?: string;
  bookFormat?: string;

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
    date: { type: String, required: true },
    views: { type: Number, required: true, default: 0 },
    likes: { type: Number, required: true, default: 0 },
    image: { type: String, required: true },
    imagePublicId: { type: String },
    type: {
      type: String,
      enum: ["text", "voice", "pdf", "book"],
      required: true,
    },
    duration: { type: String },

    // Text
    content: { type: String },

    // Voice
    audioUrl: { type: String },
    audioPublicId: { type: String },
    caption: { type: String },

    // PDF
    pdfUrl: { type: String },
    pdfPublicId: { type: String },
    pageCount: { type: Number },

    // Book
    bookUrl: { type: String },
    bookPublicId: { type: String },
    bookFormat: { type: String },

    // Shared
    tags: [{ type: String, trim: true }],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

DevotionSchema.index({ type: 1, createdAt: -1 });
DevotionSchema.index({ featured: 1 });
DevotionSchema.index({ tags: 1 });

export const DevotionModel: Model<IDevotion> =
  mongoose.models.Devotion ||
  mongoose.model<IDevotion>("Devotion", DevotionSchema);

export default DevotionModel;
