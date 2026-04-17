import { z } from "zod";

export const createConcernSchema = z.object({
    category: z.enum([
        "health",
        "inventory",
        "animal",
        "facility",
        "security",
        "task",
        "other",
    ]),
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(5000),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    assignedToUserPublicId: z.string().uuid().optional().nullable(),
    entityType: z.string().trim().max(100).optional().nullable(),
    entityPublicId: z.string().uuid().optional().nullable(),
});

export const listConcernsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["open", "in_review", "resolved", "dismissed"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    category: z
        .enum(["health", "inventory", "animal", "facility", "security", "task", "other"])
        .optional(),
    raisedByMe: z.coerce.boolean().optional(),
    assignedToMe: z.coerce.boolean().optional(),
    search: z.string().trim().min(1).max(150).optional(),
    sortBy: z.enum(["createdAt", "priority", "status"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateConcernSchema = z
    .object({
        status: z.enum(["open", "in_review", "resolved", "dismissed"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedToUserPublicId: z.string().uuid().nullable().optional(),
        resolutionNotes: z.string().trim().max(5000).nullable().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
        path: [],
    });