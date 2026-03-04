import { z } from "zod";

// ─── Product schemas ─────────────────────────────────────────

export const createProductSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must be at most 100 characters"),
    shortDescription: z
      .string()
      .min(5, "Short description must be at least 5 characters")
      .max(300, "Short description must be at most 300 characters"),
    price: z
      .number({ message: "Price must be a number" })
      .positive("Price must be greater than 0"),
    category: z.string().optional().default("other"),
    imageUrls: z
      .array(z.string().url("Each image must be a valid URL"))
      .min(1, "At least one image URL is required")
      .max(4, "At most 4 image URLs are allowed")
      .optional(),
    stock: z
      .number({ message: "Stock must be a number" })
      .int("Stock must be an integer")
      .min(0, "Stock cannot be negative"),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must be at most 100 characters")
      .optional(),
    shortDescription: z
      .string()
      .min(5, "Short description must be at least 5 characters")
      .max(300, "Short description must be at most 300 characters")
      .optional(),
    price: z
      .number({ message: "Price must be a number" })
      .positive("Price must be greater than 0")
      .optional(),
    imageUrls: z
      .array(z.string().url("Each image must be a valid URL"))
      .min(1, "At least one image URL is required")
      .max(4, "At most 4 image URLs are allowed")
      .optional(),
    category: z.string().optional(),
    stock: z
      .number({ message: "Stock must be a number" })
      .int("Stock must be an integer")
      .min(0, "Stock cannot be negative")
      .optional(),
  }),
});

// ─── Order schemas ───────────────────────────────────────────

export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid("Product ID must be a valid UUID"),
          quantity: z
            .number({ message: "Quantity must be a number" })
            .int("Quantity must be an integer")
            .min(1, "Quantity must be at least 1"),
        }),
      )
      .min(1, "At least one item is required"),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(
      ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
      { message: "Invalid order status" },
    ),
  }),
});
