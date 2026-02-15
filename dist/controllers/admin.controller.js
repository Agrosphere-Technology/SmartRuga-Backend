"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPlatformRole = updateUserPlatformRole;
const models_1 = require("../models");
const roles_1 = require("../constants/roles");
const http_status_codes_1 = require("http-status-codes");
const auth_validator_1 = require("../validators/auth.validator");
async function updateUserPlatformRole(req, res) {
    try {
        const parsed = auth_validator_1.updateRoleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invalid platformRole", issues: parsed.error.issues });
        }
        const targetUserId = req.params.id;
        const newRole = parsed.data
            .platformRole;
        // requester is already set by requireAuth()
        const requester = req.user;
        const requesterRole = requester.platformRole;
        const target = await models_1.User.findByPk(targetUserId);
        if (!target) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "User not found" });
        }
        const targetRole = target.get("platform_role");
        // Protect super_admin from being modified
        if (targetRole === roles_1.PLATFORM_ROLES.SUPER_ADMIN) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Cannot modify a super_admin" });
        }
        // Only super_admin can assign super_admin
        if (newRole === roles_1.PLATFORM_ROLES.SUPER_ADMIN &&
            requesterRole !== roles_1.PLATFORM_ROLES.SUPER_ADMIN) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Only super_admin can assign super_admin role" });
        }
        // Admins should not modify other admins (optional policy)
        if (requesterRole === roles_1.PLATFORM_ROLES.ADMIN &&
            targetRole === roles_1.PLATFORM_ROLES.ADMIN) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Admins cannot change other admins" });
        }
        await target.update({ platform_role: newRole });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            id: target.get("id"),
            email: target.get("email"),
            platformRole: target.get("platform_role"),
        });
    }
    catch (err) {
        console.error("UPDATE_USER_ROLE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to update user role",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
