"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkAnimalLookupSchema = exports.animalLookupSchema = void 0;
const zod_1 = require("zod");
exports.animalLookupSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, "identifier is required"),
});
exports.bulkAnimalLookupSchema = zod_1.z.object({
    identifiers: zod_1.z
        .array(zod_1.z.string().min(1))
        .min(1, "At least one identifier is required")
        .max(500, "Too many identifiers in one request"),
});
