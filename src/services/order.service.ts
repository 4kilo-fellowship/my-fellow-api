import { Order, OrderStatus, IOrderItem } from "../models/order.model.js";
import { Product } from "../models/product.model.js";

interface OrderItemInput {
  productId: string;
  quantity: number;
}

export class OrderService {
  static async create(userId: string, items: OrderItemInput[]) {
    let totalAmount = 0;
    const orderItemsData: IOrderItem[] = [];

    // Verify stock and calculate line totals
    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.title}". Available: ${product.stock}, requested: ${item.quantity}`,
        );
      }

      // Decrement stock
      product.stock -= item.quantity;
      await product.save();

      const lineTotal = product.price * item.quantity;
      totalAmount += lineTotal;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        product: {
          id: (product._id as any).toString(),
          title: product.title,
          price: product.price,
          imageUrls: product.imageUrls,
          category: product.category,
        },
      });
    }

    const order = await Order.create({
      userId,
      totalAmount,
      items: orderItemsData,
      status: "PENDING",
    });

    return order.toJSON();
  }

  static async getByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ userId }),
    ]);

    const formattedOrders = orders.map((o: any) => ({
      ...o,
      id: o._id.toString(),
    }));

    return {
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(),
    ]);

    const formattedOrders = orders.map((o: any) => ({
      ...o,
      id: o._id.toString(),
    }));

    return {
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const order = await Order.findById(id).lean();
    if (!order) return null;
    return {
      ...order,
      id: (order as any)._id.toString(),
    };
  }

  static async updateStatus(id: string, status: OrderStatus) {
    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    ).lean();

    if (!order) return null;
    return {
      ...order,
      id: (order as any)._id.toString(),
    };
  }
}
