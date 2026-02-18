import z from "zod";

export const listAlertsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    // supports: ?type=health_sick OR ?type=health_sick,status_sold
    type: z
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

    // supports: ?unread=true / false
    unread: z
        .string()
        .optional()
        .transform((v) => {
            if (v === undefined) return undefined;
            if (v === "true") return true;
            if (v === "false") return false;
            return undefined;
        }),
});


export const bulkReadSchema = z
    .object({
        alertIds: z.array(z.string().uuid()).min(1),
    })
    .strict();
