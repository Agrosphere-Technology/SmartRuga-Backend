"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSuperAdmin = ensureSuperAdmin;
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("../models");
const roles_1 = require("../constants/roles");
async function ensureSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL || "";
    const password = process.env.SUPER_ADMIN_PASSWORD || "";
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || "Super";
    const lastName = process.env.SUPER_ADMIN_LAST_NAME || "Admin";
    // console.log("🔐 Ensuring super admin user exists...");
    // console.log(`   Email: ${email}`);
    // console.log(`   First Name: ${firstName}`);
    // console.log(`   Last Name: ${lastName}`);
    // console.log(`   Password: ${password ? "********" : "(not set)"}`);
    if (!email || !password) {
        console.warn("⚠️ SUPER_ADMIN_EMAIL or SUPERADMIN_PASSWORD not set. Skipping super admin creation.");
        return;
    }
    if (process.env.NODE_ENV === "production" && password === "adminpass123") {
        console.warn("⚠️ Change your SUPERADMIN_PASSWORD in production!");
        return;
    }
    // Prefer checking by role, not email, to guarantee at least one super_admin exists
    const existing = await models_1.User.findOne({
        where: { platform_role: roles_1.PLATFORM_ROLES.SUPER_ADMIN },
    });
    if (existing) {
        console.log("ℹ️ Super admin already exists.");
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    await models_1.User.create({
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        platform_role: roles_1.PLATFORM_ROLES.SUPER_ADMIN,
    });
    console.log(`✅ Super admin created with email: ${email}`);
}
