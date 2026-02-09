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
    fullName: z.string().min(2).max(100),
    phoneNumber: z.string().min(10).max(15),
    profileImage: z.string().url().optional(),
    pastTeam: z.string().max(100).optional(),
    department: z.string().min(2).max(100),
    year: z.string().min(1).max(20),
    telegramHandle: z.string().min(2).max(50),
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
