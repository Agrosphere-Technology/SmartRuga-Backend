"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRanchAccess = void 0;
const models_1 = require("../models");
const http_status_codes_1 = require("http-status-codes");
const roles_1 = require("../constants/roles");
const requireRanchAccess = (slugParam = "slug") => async (req, res, next) => {
    try {
        const slug = req.params[slugParam];
        const userId = req.user.id;
        const ranch = await models_1.Ranch.findOne({ where: { slug } });
        if (!ranch) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Ranch not found" });
        }
        const membership = await models_1.RanchMember.findOne({
            where: { ranch_id: ranch.get("id"), user_id: userId },
        });
        if (!membership) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Access denied" });
        }
        if (membership.get("status") !== roles_1.MEMBERSHIP_STATUS.ACTIVE) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Membership not active" });
        }
        req.ranch = {
            id: ranch.get("id"),
            slug: ranch.get("slug"),
            name: ranch.get("name"),
        };
        req.membership = {
            id: membership.get("id"),
            ranchRole: membership.get("role"),
            status: membership.get("status"),
        };
        return next();
    }
    catch (err) {
        console.error("RANCH_ACCESS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to resolve ranch access",
            error: err?.message ?? "Unknown error",
        });
    }
};
exports.requireRanchAccess = requireRanchAccess;
