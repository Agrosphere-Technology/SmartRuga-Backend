import { z } from "zod";

export const createVaccinationSchema = z.object({
    vaccineName: z.string().min(2).max(120),
    dose: z.string().max(60).optional(),
    administeredAt: z.string().datetime().optional(),
    nextDueAt: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
});

export const updateVaccinationSchema = z
    .object({
        vaccineName: z.string().min(1).max(120).optional(),
        dose: z.string().max(60).nullable().optional(),
        administeredAt: z.string().datetime().optional(),
        nextDueAt: z.string().datetime().nullable().optional(),
        notes: z.string().max(5000).nullable().optional(),
    })
    .refine(
        (data) => {
            if (data.administeredAt && data.nextDueAt) {
                return new Date(data.nextDueAt) >= new Date(data.administeredAt);
            }
            return true;
        },
        {
            message: "nextDueAt cannot be earlier than administeredAt",
            path: ["nextDueAt"],
        }
    );

export const deleteVaccinationSchema = z.object({
    reason: z.string().max(500).optional(),
});