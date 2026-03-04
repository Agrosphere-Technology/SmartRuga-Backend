import { z } from "zod";

export const createVaccinationSchema = z.object({
    vaccineName: z.string().min(2).max(120),
    dose: z.string().max(60).optional(),
    administeredAt: z.string().datetime().optional(),
    nextDueAt: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
});