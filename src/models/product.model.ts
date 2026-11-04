import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProduct {
  title: string;
  shortDescription: string;
  price: number;
  imageUrls: string[];
  category?: string;
  stock: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProductDocument extends IProduct, Document {}

const ProductSchema = new Schema<IProductDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    shortDescription: { type: String, required: true, trim: true, maxlength: 300 },
    price: { type: Number, required: true, min: 0 },
    imageUrls: { type: [String], default: [] },
    category: { type: String, default: "other", trim: true },
    stock: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ category: 1 });

export const Product: Model<IProductDocument> =
  mongoose.models.Product ||
  mongoose.model<IProductDocument>("Product", ProductSchema);
export default Product;
