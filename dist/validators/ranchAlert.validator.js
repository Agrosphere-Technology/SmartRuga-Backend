"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkReadSchema = exports.listRanchAlertsQuerySchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.listRanchAlertsQuerySchema = zod_1.default.object({
    page: zod_1.default.coerce.number().int().min(1).default(1),
    limit: zod_1.default.coerce.number().int().min(1).max(100).default(20),
    alertType: zod_1.default
        .string()
        .optional()
        .transform((v) => {
        if (!v)
            return undefined;
        const parts = v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        return parts.length ? parts : undefined;
    }),
    unread: zod_1.default
        .string()
        .optional()
        .transform((v) => {
        if (v === undefined)
            return undefined;
        if (v === "true")
            return true;
        if (v === "false")
            return false;
        return undefined;
    }),
    animalId: zod_1.default.string().uuid().optional(),
    from: zod_1.default.string().datetime().optional(),
    to: zod_1.default.string().datetime().optional(),
});
exports.bulkReadSchema = zod_1.default
    .object({
    alertIds: zod_1.default.array(zod_1.default.string().uuid()).min(1),
})
    .strict();
