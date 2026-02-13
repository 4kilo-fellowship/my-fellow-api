import { z } from "zod";

export const locationCoordinatesSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const locationBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(2, "Address must be at least 2 characters"),
  coordinates: locationCoordinatesSchema,
  serviceTimes: z
    .array(z.string())
    .min(1, "At least one service time is required"),
  googleMapsUrl: z.string().url("Invalid Google Maps URL"),
  image: z.string().optional(),
});

export type Location = z.infer<typeof locationBaseSchema>;
export type LocationCoordinates = z.infer<typeof locationCoordinatesSchema>;
