import { z } from "zod";

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const leaderSchema = z.object({
  name: z.string().min(2, "Leader name is required"),
  role: z.string().min(2, "Leader role is required"),
  imageUrl: z.string().url(),
  telegram: z.string(),
  phone: z.string(),
});

export const teamBaseSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters"),
  icon: z.string(),
  color: z.string(),
  members: z.coerce.number().int().nonnegative().default(0),
  description: z.string().min(10, "Description must be at least 10 characters"),
  about: z.string(),
  meetingDay: z.string(),
  time: z.string(),
  category: z.string(),
  location: z.string(),
  coordinates: coordinatesSchema,
  imageUrl: z.string().url(),
  leader: leaderSchema,
});

export type Team = z.infer<typeof teamBaseSchema>;
export type TeamLeader = z.infer<typeof leaderSchema>;
export type TeamCoordinates = z.infer<typeof coordinatesSchema>;
