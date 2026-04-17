"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPlatformRole = updateUserPlatformRole;
const models_1 = require("../models");
const roles_1 = require("../constants/roles");
const http_status_codes_1 = require("http-status-codes");
const auth_validator_1 = require("../validators/auth.validator");
const apiResponse_1 = require("../utils/apiResponse");
async function updateUserPlatformRole(req, res) {
    try {
        const parsed = auth_validator_1.updateRoleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid platformRole",
                errors: parsed.error.issues,
            }));
        }
        const targetUserId = req.params.id;
        if (typeof targetUserId !== "string") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "target user Id must be a string",
            }));
        }
        const newRole = parsed.data
            .platformRole;
        const requester = req.user;
        const requesterRole = requester.platformRole;
        const target = await models_1.User.findByPk(targetUserId);
        if (!target) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "User not found",
            }));
        }
        const targetRole = target.get("platform_role");
        if (targetRole === roles_1.PLATFORM_ROLES.SUPER_ADMIN) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Cannot modify a super_admin",
            }));
        }
        if (newRole === roles_1.PLATFORM_ROLES.SUPER_ADMIN &&
            requesterRole !== roles_1.PLATFORM_ROLES.SUPER_ADMIN) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only super_admin can assign super_admin role",
            }));
        }
        if (requesterRole === roles_1.PLATFORM_ROLES.ADMIN &&
            targetRole === roles_1.PLATFORM_ROLES.ADMIN) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Admins cannot change other admins",
            }));
        }
        await target.update({ platform_role: newRole });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "User platform role updated successfully",
            data: {
                user: {
                    id: target.get("id"),
                    email: target.get("email"),
                    platformRole: target.get("platform_role"),
                },
            },
        }));
    }
    catch (err) {
        console.error("UPDATE_USER_ROLE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to update user role",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
