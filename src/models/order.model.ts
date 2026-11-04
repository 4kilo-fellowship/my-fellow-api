import mongoose, { Document, Model, Schema } from "mongoose";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface IOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: {
    id: string;
    title: string;
    price: number;
    imageUrls: string[];
    category?: string;
  };
}

export interface IOrder {
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  items: IOrderItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrderDocument extends IOrder, Document {}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    product: {
      id: { type: String },
      title: { type: String },
      price: { type: Number },
      imageUrls: { type: [String], default: [] },
      category: { type: String },
    },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    items: { type: [OrderItemSchema], default: [] },
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

OrderSchema.index({ createdAt: -1 });

export const Order: Model<IOrderDocument> =
  mongoose.models.Order ||
  mongoose.model<IOrderDocument>("Order", OrderSchema);
export default Order;
