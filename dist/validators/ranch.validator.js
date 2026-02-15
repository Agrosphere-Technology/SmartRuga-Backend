"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRanchSchema = void 0;
const zod_1 = require("zod");
exports.createRanchSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    locationName: zod_1.z.string().min(2).optional(),
    address: zod_1.z.string().min(3).optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
});
