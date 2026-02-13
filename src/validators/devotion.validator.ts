import { z } from "zod";

// ─── Shared enum ────────────────────────────────────────────────────
const DEVOTION_TYPES = ["text", "voice", "pdf", "book"] as const;
const devotionTypeEnum = z.enum(DEVOTION_TYPES, {
  message: "Type must be one of: text, voice, pdf, book",
});

// ─── Create ─────────────────────────────────────────────────────────
export const createDevotionSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    author: z.string().min(2, "Author name must be at least 2 characters"),
    date: z.string().min(1, "Date is required"),
    type: devotionTypeEnum,
    image: z.string().url().optional(), // May come via file upload instead
    views: z.coerce.number().int().min(0).optional(),
    likes: z.coerce.number().int().min(0).optional(),

    // Text type
    content: z.string().optional(),

    // Voice type
    audioUrl: z.string().url().optional(),
    duration: z.string().optional(),
    caption: z.string().optional(), // Text description for voice devotions

    // PDF type
    pdfUrl: z.string().url().optional(),
    pageCount: z.coerce.number().int().min(1).optional(),

    // Book type
    bookUrl: z.string().url().optional(),
    bookFormat: z.string().optional(),

    // Shared metadata
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) =>
        val
          ? typeof val === "string"
            ? val.split(",").map((t) => t.trim())
            : val
          : undefined,
      ),
    featured: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) =>
        val === "true" || val === true
          ? true
          : val === "false"
            ? false
            : undefined,
      ),
  })
  .superRefine((data, ctx) => {
    // Type-specific validation
    if (data.type === "text" && !data.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text devotions require a 'content' field",
        path: ["content"],
      });
    }

    if (data.type === "voice" && !data.duration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Voice devotions require a 'duration' field (e.g. '5:20')",
        path: ["duration"],
      });
    }
  });

// ─── Update ─────────────────────────────────────────────────────────
export const updateDevotionSchema = z.object({
  title: z.string().min(3).optional(),
  author: z.string().min(2).optional(),
  date: z.string().optional(),
  type: devotionTypeEnum.optional(),
  image: z.string().url().optional(),
  views: z.coerce.number().int().min(0).optional(),
  likes: z.coerce.number().int().min(0).optional(),

  content: z.string().optional(),

  audioUrl: z.string().url().optional(),
  duration: z.string().optional(),
  caption: z.string().optional(),

  pdfUrl: z.string().url().optional(),
  pageCount: z.coerce.number().int().min(1).optional(),

  bookUrl: z.string().url().optional(),
  bookFormat: z.string().optional(),

  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) =>
      val
        ? typeof val === "string"
          ? val.split(",").map((t) => t.trim())
          : val
        : undefined,
    ),
  featured: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) =>
      val === "true" || val === true
        ? true
        : val === "false"
          ? false
          : undefined,
    ),
});

export type CreateDevotionInput = z.infer<typeof createDevotionSchema>;
export type UpdateDevotionInput = z.infer<typeof updateDevotionSchema>;
