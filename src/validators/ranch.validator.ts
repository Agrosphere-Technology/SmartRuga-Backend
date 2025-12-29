import { z } from "zod";

export const createRanchSchema = z.object({
  name: z.string().min(2),
  locationName: z.string().min(2).optional(),
  address: z.string().min(3).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
