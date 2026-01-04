import { z } from "zod";

export const signUpSchema = z
  .object({
    fullName: z.string().min(3),
    phoneNumber: z.string().min(10).max(13),
    team: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    yearOfStudy: z.number().int().positive().optional().nullable(),
    telegramUserName: z.string().optional().nullable(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
