import { z } from "zod";

export const animalLookupSchema = z.object({
    identifier: z.string().min(1, "identifier is required"),
});

export const bulkAnimalLookupSchema = z.object({
    identifiers: z
        .array(z.string().min(1))
        .min(1, "At least one identifier is required")
        .max(500, "Too many identifiers in one request"),
});