import { z } from "zod";

export const leaderBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  phoneNumber: z.string().min(10, "Phone number is required"),
  telegram: z.string().min(2, "Telegram handle is required"),
  isVerified: z.boolean().optional(),
  type: z.string().min(2, "Type is required"),
  image: z.string().optional(),
});

export type Leader = z.infer<typeof leaderBaseSchema>;
