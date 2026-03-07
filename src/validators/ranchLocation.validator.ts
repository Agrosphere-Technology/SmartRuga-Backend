import { z } from "zod";

export const createRanchLocationSchema = z.object({
    name: z.string().trim().min(1).max(100),
    code: z.string().trim().max(50).optional().nullable(),
    locationType: z.enum([
        "barn",
        "pen",
        "pasture",
        "quarantine",
        "clinic",
        "loading_bay",
        "market",
        "external",
        "other",
    ]),
    description: z.string().trim().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
});

export const updateRanchLocationSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    code: z.string().trim().max(50).optional().nullable(),
    locationType: z
        .enum([
            "barn",
            "pen",
            "pasture",
            "quarantine",
            "clinic",
            "loading_bay",
            "market",
            "external",
            "other",
        ])
        .optional(),
    description: z.string().trim().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
});