import { z } from "zod";

export const paymentInitSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  fullName: z.string().min(1, "Full name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"), // Adding email as Chapa requires it for receipts
  team: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  yearOfStudy: z.string().optional().nullable(),
  telegramUserName: z.string().optional().nullable(),
  reason: z.string().optional().default("gift"),
});

export type PaymentInitInput = z.infer<typeof paymentInitSchema>;
