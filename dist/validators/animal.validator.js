"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAnimalSchema = exports.listAnimalsQuerySchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.listAnimalsQuerySchema = zod_1.default.object({
    page: zod_1.default.coerce.number().int().min(1).default(1),
    limit: zod_1.default.coerce.number().int().min(1).max(100).default(20),
    speciesId: zod_1.default.string().uuid().optional(),
    status: zod_1.default.enum(["active", "sold", "deceased"]).optional(),
    sex: zod_1.default.enum(["male", "female", "unknown"]).optional(),
    healthStatus: zod_1.default
        .enum(["healthy", "sick", "recovering", "quarantined"])
        .optional(),
    breed: zod_1.default.string().max(120).optional().nullable(),
    weight: zod_1.default.number().optional().nullable(),
    q: zod_1.default.string().trim().min(1).max(100).optional(),
    sortBy: zod_1.default.enum(["createdAt", "tagNumber"]).default("createdAt"),
    sortOrder: zod_1.default.enum(["asc", "desc"]).default("desc"),
});
exports.updateAnimalSchema = zod_1.default
    .object({
    speciesId: zod_1.default.string().uuid().optional(),
    tagNumber: zod_1.default.string().min(1).max(100).nullable().optional(),
    sex: zod_1.default.enum(["male", "female", "unknown"]).optional(),
    rfidTag: zod_1.default.string().min(1).max(100).nullable().optional(),
    dateOfBirth: zod_1.default.string().date().nullable().optional(),
    breed: zod_1.default.string().max(120).optional().nullable(),
    weight: zod_1.default.number().optional().nullable(),
    status: zod_1.default.enum(["active", "sold", "deceased"]).optional(),
    statusNotes: zod_1.default.string().max(1000).optional().nullable(),
    imageUrl: zod_1.default.string().url().max(2000).optional().nullable(),
    imagePublicId: zod_1.default.string().max(255).optional().nullable(),
})
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
    path: [],
});
