import { prisma } from "../utils/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export class ProductService {
  static async getAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count(),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  }

  static async create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data });
  }

  static async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  }

  static async remove(id: string) {
    return prisma.product.delete({ where: { id } });
  }
}
