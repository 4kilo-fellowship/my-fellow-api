import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
  });

export const createJoinRequestSchema = z.object({
  body: z.object({
    teamId: objectIdSchema,
    message: z.string().max(500).optional(),
  }),
});

export const updateJoinRequestStatusSchema = z.object({
  params: z.object({
    requestId: objectIdSchema,
  }),
  body: z.object({
    status: z.enum(["approved", "rejected"]),
  }),
});
