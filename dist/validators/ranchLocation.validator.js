"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRanchLocationSchema = exports.createRanchLocationSchema = void 0;
const zod_1 = require("zod");
exports.createRanchLocationSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(100),
    code: zod_1.z.string().trim().max(50).optional().nullable(),
    locationType: zod_1.z.enum([
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
    description: zod_1.z.string().trim().max(500).optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateRanchLocationSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(100).optional(),
    code: zod_1.z.string().trim().max(50).optional().nullable(),
    locationType: zod_1.z
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
    description: zod_1.z.string().trim().max(500).optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
});
