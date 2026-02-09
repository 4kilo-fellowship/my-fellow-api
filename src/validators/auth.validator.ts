import { z } from "zod";

export const signUpSchema = z
  .object({
    fullName: z.string().min(3),
    phoneNumber: z.string().min(8).max(13),
    team: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    yearOfStudy: z.string().optional().nullable(),
    telegramUserName: z.string().optional().nullable(),
    pastTeam: z.string().optional().nullable(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export const signInSchema = z.object({
  phoneNumber: z.string().min(10).max(13),
  password: z.string().min(6),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(3).optional(),
  phoneNumber: z.string().min(8).max(13).optional(),
  department: z.string().optional().nullable(),
  yearOfStudy: z.string().optional().nullable(),
  telegramUserName: z.string().optional().nullable(),
  pastTeam: z.string().optional().nullable(),
});
