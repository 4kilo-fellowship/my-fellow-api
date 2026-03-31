import { z } from "zod";

export const eventBaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  shortDescription: z
    .string()
    .min(5, "Short description must be at least 5 characters"),
  fullDescription: z.string().optional(),
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "startDate must be a valid date string",
  }),
  endDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "endDate must be a valid date string",
  }),
  buttonText: z.string().optional(),
  imageUrl: z.string().url().optional(),
  registrationLimit: z.coerce.number().nullable().optional(),
  scheduledAt: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), {
      message: "scheduledAt must be a valid date string",
    })
    .optional()
    .nullable(),
});

export const createEventSchema = eventBaseSchema.superRefine((data, ctx) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "endDate must be after startDate",
      path: ["endDate"],
    });
  }
});

export const updateEventSchema = z
  .object({
    title: z.string().min(3).optional(),
    shortDescription: z.string().min(5).optional(),
    fullDescription: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    buttonText: z.string().optional(),
    imageUrl: z.string().url().optional(),
    registrationLimit: z.coerce.number().nullable().optional(),
    scheduledAt: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "scheduledAt must be a valid date string",
      })
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endDate must be after startDate",
          path: ["endDate"],
        });
      }
    }
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
