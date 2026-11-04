import { Product, IProduct } from "../models/product.model.js";

export class ProductService {
  static async getAll(page: number = 1, limit: number = 20, category?: string) {
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};

    if (category && category !== "All") {
      filter.category = new RegExp(`^${category}$`, "i");
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const formattedProducts = products.map((p: any) => ({
      ...p,
      id: p._id.toString(),
    }));

    return {
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const product = await Product.findById(id).lean();
    if (!product) return null;
    return {
      ...product,
      id: (product as any)._id.toString(),
    };
  }

  static async create(data: Partial<IProduct>) {
    const product = await Product.create(data);
    return product.toJSON();
  }

  static async update(id: string, data: Partial<IProduct>) {
    const product = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!product) return null;
    return {
      ...product,
      id: (product as any)._id.toString(),
    };
  }

  static async remove(id: string) {
    return Product.findByIdAndDelete(id).lean();
  }
}
