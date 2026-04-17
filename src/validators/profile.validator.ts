import { z } from "zod";

export const updateMeSchema = z.object({
    first_name: z.string().min(2).max(100).optional(),
    last_name: z.string().min(2).max(100).optional(),
    phone: z
        .string()
        .min(6)
        .max(30)
        .regex(/^[0-9+()\-\s]+$/, "Invalid phone format")
        .optional(),
});