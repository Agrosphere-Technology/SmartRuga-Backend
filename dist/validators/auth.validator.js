"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const roles_1 = require("../constants/roles");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.updateRoleSchema = zod_1.z.object({
    platformRole: zod_1.z.enum([
        roles_1.PLATFORM_ROLES.USER,
        roles_1.PLATFORM_ROLES.ADMIN,
        roles_1.PLATFORM_ROLES.SUPER_ADMIN,
    ]),
});
