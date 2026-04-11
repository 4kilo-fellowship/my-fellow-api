import { z } from "zod";

export const supportTicketSchema = z.object({
  message: z.string().min(1, "Message is required"),
});
