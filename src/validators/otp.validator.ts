import { z } from "zod";

export const sendOtpSchema = z.object({
  phoneNumber: z.string().min(8).max(13),
  purpose: z.enum(["signup", "update-phone"]),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(8).max(13),
  purpose: z.enum(["signup", "update-phone"]),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});
