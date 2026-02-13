import { z } from "zod";

export const createHealthEventSchema = z.object({
    status: z.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: z.string().max(5000).optional().nullable(),
});
