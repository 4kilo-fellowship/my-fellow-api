import { z } from "zod";

export const supportTicketSchema = z.object({
  message: z.string().optional(),
});
