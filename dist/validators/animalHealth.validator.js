"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthEventSchema = void 0;
const zod_1 = require("zod");
exports.createHealthEventSchema = zod_1.z.object({
    status: zod_1.z.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: zod_1.z.string().max(5000).optional().nullable(),
});
