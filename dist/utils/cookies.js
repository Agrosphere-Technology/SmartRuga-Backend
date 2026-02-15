"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRefreshCookie = setRefreshCookie;
exports.clearRefreshCookie = clearRefreshCookie;
function setRefreshCookie(res, token) {
    const secure = (process.env.COOKIE_SECURE || "false") === "true";
    const domain = process.env.COOKIE_DOMAIN || undefined;
    res.cookie("rt", token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        domain,
        path: "/api/v1/auth",
    });
}
function clearRefreshCookie(res) {
    const secure = (process.env.COOKIE_SECURE || "false") === "true";
    const domain = process.env.COOKIE_DOMAIN || undefined;
    res.clearCookie("rt", {
        httpOnly: true,
        secure,
        sameSite: "lax",
        domain,
        path: "/api/v1/auth",
    });
}
