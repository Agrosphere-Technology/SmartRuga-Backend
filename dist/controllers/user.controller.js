"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyProfile = getMyProfile;
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
async function getMyProfile(req, res) {
    try {
        const userId = req.user.id;
        const user = await models_1.User.findByPk(userId, {
            attributes: [
                "id",
                "first_name",
                "last_name",
                "email",
                "platform_role",
                "created_at",
                "updated_at",
            ],
        });
        if (!user) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "User not found" });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            id: user.get("id"),
            firstName: user.get("first_name"),
            lastName: user.get("last_name"),
            email: user.get("email"),
            platformRole: user.get("platform_role"),
            createdAt: user.get("created_at"),
            updatedAt: user.get("updated_at"),
        });
    }
    catch (err) {
        console.error("GET_PROFILE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch profile",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
