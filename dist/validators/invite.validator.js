"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInviteSchema = exports.createInviteSchema = void 0;
const zod_1 = require("zod");
const roles_1 = require("../constants/roles");
exports.createInviteSchema = zod_1.z.object({
    email: zod_1.z.email(),
    ranchRole: zod_1.z.enum([
        roles_1.RANCH_ROLES.OWNER,
        roles_1.RANCH_ROLES.MANAGER,
        roles_1.RANCH_ROLES.VET,
        roles_1.RANCH_ROLES.STOREKEEPER,
        roles_1.RANCH_ROLES.WORKER,
    ]),
});
exports.acceptInviteSchema = zod_1.z.object({
    token: zod_1.z.string().min(20),
});
