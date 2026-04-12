import z from "zod";

export const listRanchAlertsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    alertType: z
        .string()
        .optional()
        .transform((v) => {
            if (!v) return undefined;
            const parts = v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            return parts.length ? parts : undefined;
        }),

    unread: z
        .string()
        .optional()
        .transform((v) => {
            if (v === undefined) return undefined;
            if (v === "true") return true;
            if (v === "false") return false;
            return undefined;
        }),

    animalId: z.string().uuid().optional(),

    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
});

export const bulkReadSchema = z
    .object({
        alertIds: z.array(z.string().uuid()).min(1),
    })
    .strict();