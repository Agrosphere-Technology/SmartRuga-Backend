"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMeSchema = void 0;
const zod_1 = require("zod");
exports.updateMeSchema = zod_1.z.object({
    first_name: zod_1.z.string().min(2).max(100).optional(),
    last_name: zod_1.z.string().min(2).max(100).optional(),
    phone: zod_1.z
        .string()
        .min(6)
        .max(30)
        .regex(/^[0-9+()\-\s]+$/, "Invalid phone format")
        .optional(),
});
