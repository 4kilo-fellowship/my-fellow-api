import { z } from "zod";

export const paymentInitSchema = z.object({
  amount: z.number().min(1, "Minimum giving amount is 1 ETB"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  reason: z.string().optional().default("Donation"),
  returnUrl: z.string().url().optional(),
});

export type PaymentInitInput = z.infer<typeof paymentInitSchema>;
