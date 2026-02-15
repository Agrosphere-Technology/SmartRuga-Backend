"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
const crypto_1 = require("../utils/crypto");
const jwt_1 = require("../utils/jwt");
const auth_validator_1 = require("../validators/auth.validator");
const cookies_1 = require("../utils/cookies");
const roles_1 = require("../constants/roles");
// Register a new user
async function register(req, res) {
    try {
        const parsed = auth_validator_1.registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invalid payload", issues: parsed.error.issues });
        }
        const email = parsed.data.email.toLowerCase().trim();
        const { password, firstName, lastName } = parsed.data;
        const exists = await models_1.User.findOne({ where: { email } });
        if (exists) {
            return res
                .status(http_status_codes_1.StatusCodes.CONFLICT)
                .json({ message: "Email already in use" });
        }
        const password_hash = await bcrypt_1.default.hash(password, 12);
        const user = await models_1.User.create({
            email,
            password_hash,
            first_name: firstName ?? null,
            last_name: lastName ?? null,
            platform_role: roles_1.PLATFORM_ROLES.USER,
        });
        const platformRole = user.get("platform_role");
        const accessToken = (0, jwt_1.signAccessToken)({
            userId: user.get("id"),
            platformRole,
        });
        const refreshToken = (0, jwt_1.signRefreshToken)({
            userId: user.get("id"),
            platformRole,
        });
        await models_1.RefreshToken.create({
            user_id: user.get("id"),
            token_hash: (0, crypto_1.sha256)(refreshToken),
            expires_at: (0, jwt_1.refreshExpiryDate)(),
            created_at: new Date(),
        });
        (0, cookies_1.setRefreshCookie)(res, refreshToken);
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            user: {
                id: user.get("id"),
                email: user.get("email"),
                firstName: user.get("first_name"),
                lastName: user.get("last_name"),
                platformRole,
            },
            accessToken,
        });
    }
    catch (err) {
        console.error("REGISTER_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Registration failed",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
// Login an existing user
async function login(req, res) {
    try {
        const parsed = auth_validator_1.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invalid payload", issues: parsed.error.issues });
        }
        const email = parsed.data.email.toLowerCase().trim();
        const { password } = parsed.data;
        const user = await models_1.User.findOne({ where: { email } });
        if (!user) {
            return res
                .status(http_status_codes_1.StatusCodes.UNAUTHORIZED)
                .json({ message: "Invalid credentials" });
        }
        const ok = await bcrypt_1.default.compare(password, user.get("password_hash"));
        if (!ok) {
            return res
                .status(http_status_codes_1.StatusCodes.UNAUTHORIZED)
                .json({ message: "Invalid credentials" });
        }
        const platformRole = user.get("platform_role");
        const accessToken = (0, jwt_1.signAccessToken)({
            userId: user.get("id"),
            platformRole,
        });
        const refreshToken = (0, jwt_1.signRefreshToken)({
            userId: user.get("id"),
            platformRole,
        });
        await models_1.RefreshToken.create({
            user_id: user.get("id"),
            token_hash: (0, crypto_1.sha256)(refreshToken),
            expires_at: (0, jwt_1.refreshExpiryDate)(),
            created_at: new Date(),
        });
        (0, cookies_1.setRefreshCookie)(res, refreshToken);
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            user: {
                id: user.get("id"),
                email: user.get("email"),
                firstName: user.get("first_name"),
                lastName: user.get("last_name"),
                platformRole,
            },
            accessToken,
        });
    }
    catch (err) {
        console.error("LOGIN_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Login failed",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
// Refresh access token
async function refresh(req, res) {
    try {
        // cookie-first (web), fallback to body (mobile-friendly)
        const token = req.cookies?.rt || req.body?.refreshToken;
        if (!token) {
            return res
                .status(http_status_codes_1.StatusCodes.UNAUTHORIZED)
                .json({ message: "Missing refresh token" });
        }
        let decoded;
        try {
            decoded = (0, jwt_1.verifyRefreshToken)(token);
        }
        catch {
            return res
                .status(http_status_codes_1.StatusCodes.UNAUTHORIZED)
                .json({ message: "Invalid/expired refresh token" });
        }
        const tokenHash = (0, crypto_1.sha256)(token);
        const saved = await models_1.RefreshToken.findOne({
            where: { token_hash: tokenHash },
        });
        if (!saved) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Refresh token not recognized" });
        }
        if (saved.get("revoked_at")) {
            return res
                .status(http_status_codes_1.StatusCodes.UNAUTHORIZED)
                .json({ message: "Refresh token revoked" });
        }
        const expiresAt = saved.get("expires_at");
        if (expiresAt.getTime() < Date.now()) {
            return res
                .status(http_status_codes_1.StatusCodes.UNAUTHORIZED)
                .json({ message: "Refresh token expired" });
        }
        // rotate refresh token
        const newRefresh = (0, jwt_1.signRefreshToken)({
            userId: decoded.userId,
            platformRole: decoded.platformRole,
        });
        const newHash = (0, crypto_1.sha256)(newRefresh);
        await saved.update({ revoked_at: new Date(), replaced_by_hash: newHash });
        await models_1.RefreshToken.create({
            user_id: decoded.userId,
            token_hash: newHash,
            expires_at: (0, jwt_1.refreshExpiryDate)(),
            created_at: new Date(),
        });
        const newAccess = (0, jwt_1.signAccessToken)({
            userId: decoded.userId,
            platformRole: decoded.platformRole,
        });
        (0, cookies_1.setRefreshCookie)(res, newRefresh);
        return res.status(http_status_codes_1.StatusCodes.OK).json({ accessToken: newAccess });
    }
    catch (err) {
        console.error("REFRESH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Token refresh failed",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
// Logout user
async function logout(req, res) {
    try {
        const token = req.cookies?.rt || req.body?.refreshToken;
        if (token) {
            const tokenHash = (0, crypto_1.sha256)(token);
            const saved = await models_1.RefreshToken.findOne({
                where: { token_hash: tokenHash },
            });
            if (saved && !saved.get("revoked_at")) {
                await saved.update({ revoked_at: new Date() });
            }
        }
        (0, cookies_1.clearRefreshCookie)(res);
        return res.status(http_status_codes_1.StatusCodes.OK).json({ ok: true });
    }
    catch (err) {
        console.error("LOGOUT_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Logout failed",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
