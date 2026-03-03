import { prisma } from "../utils/prisma.js";
import pkg from "../generated/prisma/index.js";
import type {
  Prisma as PrismaTypes,
  OrderStatus,
} from "../generated/prisma/index.js";

const { Prisma } = pkg;
const { Decimal } = Prisma;
type Decimal = PrismaTypes.Decimal;

interface OrderItemInput {
  productId: string;
  quantity: number;
}

export class OrderService {
  static async create(userId: string, items: OrderItemInput[]) {
    return prisma.$transaction(async (tx) => {
      let totalAmount = new Decimal(0);

      const orderItemsData: {
        productId: string;
        quantity: number;
        unitPrice: Decimal;
      }[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.title}". Available: ${product.stock}, requested: ${item.quantity}`,
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        const lineTotal = product.price.mul(item.quantity);
        totalAmount = totalAmount.add(lineTotal);

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      return order;
    });
  }

  static async getByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { product: true },
          },
        },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    return {
      orders,
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
      prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { product: true },
          },
        },
      }),
      prisma.order.count(),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }

  static async updateStatus(id: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }
}
