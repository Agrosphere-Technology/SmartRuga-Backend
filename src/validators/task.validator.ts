
import { z } from "zod";

export const dueDateSchema = z
    .string()
    .trim()
    .refine(
        (value) => {
            const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateOnlyRegex.test(value)) return true;
            return !Number.isNaN(Date.parse(value));
        },
        {
            message: "dueDate must be a valid date (YYYY-MM-DD) or ISO datetime",
        }
    );

export const createTaskSchema = z.object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000).optional().nullable(),
    assignedToUserPublicId: z.string().uuid(),
    dueDate: dueDateSchema.optional().nullable(),
});

export const updateTaskStatusSchema = z.object({
    status: z.enum(["pending", "in_progress", "completed"]),
});