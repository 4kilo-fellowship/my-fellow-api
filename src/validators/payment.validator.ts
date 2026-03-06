import { z } from "zod";

export const paymentInitSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  email: z.string().email("Invalid email address"), // Chapa requires this for receipt
  reason: z.string().optional().default("Donation"),
});

export type PaymentInitInput = z.infer<typeof paymentInitSchema>;
