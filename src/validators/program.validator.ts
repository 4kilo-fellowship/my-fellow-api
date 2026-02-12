import { z } from "zod";

export const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const programBaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  day: z.string().min(2, "Day is required"),
  time: z.string().min(2, "Time is required"),
  category: z.string().min(2, "Category is required"),
  location: z.string().min(2, "Location is required"),
  coordinates: coordinatesSchema.optional(),
  image: z.union([z.string().url(), z.literal("")]).optional(),
});

export type Program = z.infer<typeof programBaseSchema>;
export type ProgramCoordinates = z.infer<typeof coordinatesSchema>;
