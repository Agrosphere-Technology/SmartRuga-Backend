import { z } from "zod";


export const recordAnimalMovementSchema = z.object({
    movementType: z.enum([
        "to_pasture",
        "to_quarantine",
        "to_barn",
        "to_market",
        "returned",
    ]),
    fromLocationId: z.string().uuid().optional().nullable(),
    toLocationId: z.string().uuid().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
});