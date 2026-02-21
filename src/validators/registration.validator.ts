import { z } from "zod";

export const createRegistrationSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
