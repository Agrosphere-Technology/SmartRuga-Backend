"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.refreshExpiryDate = refreshExpiryDate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ms_1 = __importDefault(require("ms"));
const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
function signAccessToken(payload) {
    const ttl = (process.env.ACCESS_TOKEN_TTL || "15m");
    return jsonwebtoken_1.default.sign(payload, accessSecret, { expiresIn: ttl });
}
function signRefreshToken(payload) {
    const ttl = (process.env.REFRESH_TOKEN_TTL || "30d");
    return jsonwebtoken_1.default.sign(payload, refreshSecret, { expiresIn: ttl });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, accessSecret);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, refreshSecret);
}
function refreshExpiryDate() {
    const ttl = (process.env.REFRESH_TOKEN_TTL || "30d");
    return new Date(Date.now() + (0, ms_1.default)(ttl));
}
