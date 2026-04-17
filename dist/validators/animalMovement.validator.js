"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAnimalMovementSchema = void 0;
const zod_1 = require("zod");
exports.recordAnimalMovementSchema = zod_1.z.object({
    movementType: zod_1.z.enum([
        "to_pasture",
        "to_quarantine",
        "to_barn",
        "to_market",
        "returned",
    ]),
    fromLocationId: zod_1.z.string().uuid().optional().nullable(),
    toLocationId: zod_1.z.string().uuid().optional().nullable(),
    notes: zod_1.z.string().trim().max(1000).optional().nullable(),
});
