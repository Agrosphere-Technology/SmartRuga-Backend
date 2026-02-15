"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const requireAuth = (platformRoles = []) => async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const token = authHeader.split(" ")[1];
        // const token = authHeader?.startsWith("Bearer ")
        //   ? authHeader.slice(7).trim()
        //   : null;
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await models_1.User.findByPk(decoded.userId);
        if (!user)
            return res.status(401).json({ message: "User not found" });
        // block deactivated / soft-deleted users
        if (user.get("deleted_at")) {
            return res.status(401).json({ message: "Account deactivated" });
        }
        if (user.get("is_active") === false) {
            return res.status(401).json({ message: "Account deactivated" });
        }
        req.user = {
            id: user.get("id"),
            email: user.get("email"),
            platformRole: user.get("platform_role"),
            firstName: user.get("first_name") ?? null,
            lastName: user.get("last_name") ?? null,
        };
        if (platformRoles.length &&
            !platformRoles.includes(req.user.platformRole)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.requireAuth = requireAuth;
