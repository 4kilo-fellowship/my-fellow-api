import { z } from "zod";

export const paymentInitSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  reason: z.string().optional().default("gift"),
  userId: z.string().optional(), // In case it's passed from frontend or middleware
});

export type PaymentInitInput = z.infer<typeof paymentInitSchema>;
