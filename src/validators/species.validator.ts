import { z } from "zod";

export const createSpeciesSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(100, "Name cannot exceed 100 characters"),

    code: z
        .string()
        .trim()
        .min(1, "Code is required")
        .max(20, "Code cannot exceed 20 characters")
        .transform((value) => value.toUpperCase()),
});

export const updateSpeciesSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Name cannot be empty")
        .max(100, "Name cannot exceed 100 characters")
        .optional(),

    code: z
        .string()
        .trim()
        .min(1, "Code cannot be empty")
        .max(20, "Code cannot exceed 20 characters")
        .transform((value) => value.toUpperCase())
        .optional(),
});