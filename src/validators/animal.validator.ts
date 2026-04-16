import z from "zod";

export const listAnimalsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    speciesId: z.string().uuid().optional(),
    status: z.enum(["active", "sold", "deceased"]).optional(),
    sex: z.enum(["male", "female", "unknown"]).optional(),
    healthStatus: z
        .enum(["healthy", "sick", "recovering", "quarantined"])
        .optional(),
    breed: z.string().max(120).optional().nullable(),
    weight: z.number().optional().nullable(),
    q: z.string().trim().min(1).max(100).optional(),
    sortBy: z.enum(["createdAt", "tagNumber"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateAnimalSchema = z
    .object({
        speciesId: z.string().uuid().optional(),
        tagNumber: z.string().min(1).max(100).nullable().optional(),
        sex: z.enum(["male", "female", "unknown"]).optional(),
        rfidTag: z.string().min(1).max(100).nullable().optional(),
        dateOfBirth: z.string().date().nullable().optional(),
        breed: z.string().max(120).optional().nullable(),
        weight: z.number().optional().nullable(),
        status: z.enum(["active", "sold", "deceased"]).optional(),
        statusNotes: z.string().max(1000).optional().nullable(),
        imageUrl: z.string().url().max(2000).optional().nullable(),
        imagePublicId: z.string().max(255).optional().nullable(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
        path: [],
    });