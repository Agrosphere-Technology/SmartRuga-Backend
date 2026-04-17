"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSpeciesSchema = exports.createSpeciesSchema = void 0;
const zod_1 = require("zod");
exports.createSpeciesSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(100, "Name cannot exceed 100 characters"),
    code: zod_1.z
        .string()
        .trim()
        .min(1, "Code is required")
        .max(20, "Code cannot exceed 20 characters")
        .transform((value) => value.toUpperCase()),
});
exports.updateSpeciesSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, "Name cannot be empty")
        .max(100, "Name cannot exceed 100 characters")
        .optional(),
    code: zod_1.z
        .string()
        .trim()
        .min(1, "Code cannot be empty")
        .max(20, "Code cannot exceed 20 characters")
        .transform((value) => value.toUpperCase())
        .optional(),
});
