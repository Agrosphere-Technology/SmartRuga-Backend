"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConcernSchema = exports.listConcernsQuerySchema = exports.createConcernSchema = void 0;
const zod_1 = require("zod");
exports.createConcernSchema = zod_1.z.object({
    category: zod_1.z.enum([
        "health",
        "inventory",
        "animal",
        "facility",
        "security",
        "task",
        "other",
    ]),
    title: zod_1.z.string().trim().min(1).max(150),
    description: zod_1.z.string().trim().min(1).max(5000),
    priority: zod_1.z.enum(["low", "medium", "high", "urgent"]).optional(),
    assignedToUserPublicId: zod_1.z.string().uuid().optional().nullable(),
    entityType: zod_1.z.string().trim().max(100).optional().nullable(),
    entityPublicId: zod_1.z.string().uuid().optional().nullable(),
});
exports.listConcernsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: zod_1.z.enum(["open", "in_review", "resolved", "dismissed"]).optional(),
    priority: zod_1.z.enum(["low", "medium", "high", "urgent"]).optional(),
    category: zod_1.z
        .enum(["health", "inventory", "animal", "facility", "security", "task", "other"])
        .optional(),
    raisedByMe: zod_1.z.coerce.boolean().optional(),
    assignedToMe: zod_1.z.coerce.boolean().optional(),
    search: zod_1.z.string().trim().min(1).max(150).optional(),
    sortBy: zod_1.z.enum(["createdAt", "priority", "status"]).default("createdAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
});
exports.updateConcernSchema = zod_1.z
    .object({
    status: zod_1.z.enum(["open", "in_review", "resolved", "dismissed"]).optional(),
    priority: zod_1.z.enum(["low", "medium", "high", "urgent"]).optional(),
    assignedToUserPublicId: zod_1.z.string().uuid().nullable().optional(),
    resolutionNotes: zod_1.z.string().trim().max(5000).nullable().optional(),
})
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
    path: [],
});
