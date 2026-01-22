import { z } from "zod";

export const createRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 characters"),
  team: z.string().optional(),
  department: z.string().min(2, "Department is required"),
  yearOfStudy: z.union([z.string(), z.number()]),
  telegramUserName: z.string().optional(),
  eventTitle: z.string().min(3, "Event title is required"),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
