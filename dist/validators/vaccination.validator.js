"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVaccinationSchema = exports.updateVaccinationSchema = exports.createVaccinationSchema = void 0;
const zod_1 = require("zod");
exports.createVaccinationSchema = zod_1.z.object({
    vaccineName: zod_1.z.string().min(2).max(120),
    dose: zod_1.z.string().max(60).optional(),
    administeredAt: zod_1.z.string().datetime().optional(),
    nextDueAt: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.updateVaccinationSchema = zod_1.z
    .object({
    vaccineName: zod_1.z.string().min(1).max(120).optional(),
    dose: zod_1.z.string().max(60).nullable().optional(),
    administeredAt: zod_1.z.string().datetime().optional(),
    nextDueAt: zod_1.z.string().datetime().nullable().optional(),
    notes: zod_1.z.string().max(5000).nullable().optional(),
})
    .refine((data) => {
    if (data.administeredAt && data.nextDueAt) {
        return new Date(data.nextDueAt) >= new Date(data.administeredAt);
    }
    return true;
}, {
    message: "nextDueAt cannot be earlier than administeredAt",
    path: ["nextDueAt"],
});
exports.deleteVaccinationSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
