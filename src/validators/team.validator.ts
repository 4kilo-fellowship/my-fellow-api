import { z } from "zod";

// Base schemas for reusable parts
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const leaderSchema = z.object({
  name: z.string().min(2, "Leader name is required"),
  role: z.string().min(2, "Leader role is required"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  telegram: z.string().optional(),
  phone: z.string().optional(),
});

export const teamBaseSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters"),
  icon: z.string().optional(), // Could be an icon name or URL
  color: z
    .string()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "Invalid hex color")
    .optional(),
  members: z.coerce.number().int().nonnegative().optional().default(0),
  description: z.string().min(10, "Description must be at least 10 characters"),
  about: z.string().optional(),
  meetingDay: z.string().optional(),
  time: z.string().optional(), // Format "5:30 PM - 7:30 PM"
  category: z.string().optional(),
  location: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  leader: leaderSchema.optional(),
});

// Create schema (extends base, makes some fields required if needed)
export const createTeamSchema = teamBaseSchema;
// In create, maybe name and description are strict requirements.
// Base schema has min constraints so simply extending is fine,
// or using it directly.Zod's .optional() in base might need refinement for Create vs Update.
// However, the prompt says "full CRUD... with restricted to admin users".

// Let's refine for Create: make sure vital fields are present.
export const createTeamInputSchema = z.object({
  name: z.string().min(3, "Team name is required"),
  icon: z.string().optional(),
  color: z.string().optional(),
  // members can be 0 init
  description: z.string().optional(),
  about: z.string().optional(),
  meetingDay: z.string().optional(),
  time: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  coordinates: z
    .preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
      return val;
    }, coordinatesSchema)
    .optional(),
  // Image handling: usually file upload or url string.
  // If file upload, this might come as multipart form data.
  // Zod validation on bad request body often happens before file handling.
  // We'll assume the controller handles parsing specific fields if they come as strings from FormData.

  // Actually, standard JSON body is easier if not multipart.
  // But images usually imply multipart.
  // The existing `createEvent` uses `uploadSingle` middleware and checks `req.file`.
  // So `imageUrl` might be injected by controller or passed if using external URL.
  imageUrl: z.string().optional(),
  leader: z
    .preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
      return val;
    }, leaderSchema)
    .optional(),
});
// NOTE: weak validation on create for optional fields to match loose requirement,
// but strict types on what IS provided.

// Update schema - everything optional
export const updateTeamInputSchema = createTeamInputSchema.partial();

export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamInputSchema>;
export type TeamLeader = z.infer<typeof leaderSchema>;
export type TeamCoordinates = z.infer<typeof coordinatesSchema>;
