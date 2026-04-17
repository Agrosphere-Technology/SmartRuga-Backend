"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelTaskSchema = exports.updateTaskStatusSchema = exports.createTaskSchema = exports.dueDateSchema = void 0;
const zod_1 = require("zod");
exports.dueDateSchema = zod_1.z
    .string()
    .trim()
    .refine((value) => {
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyRegex.test(value))
        return true;
    return !Number.isNaN(Date.parse(value));
}, {
    message: "dueDate must be a valid date (YYYY-MM-DD) or ISO datetime",
});
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(150),
    description: zod_1.z.string().trim().max(5000).optional().nullable(),
    assignedToUserPublicId: zod_1.z.string().uuid(),
    dueDate: exports.dueDateSchema.optional().nullable(),
});
exports.updateTaskStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["pending", "in_progress", "completed"]),
});
exports.cancelTaskSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().min(1).max(1000).optional().nullable(),
});
