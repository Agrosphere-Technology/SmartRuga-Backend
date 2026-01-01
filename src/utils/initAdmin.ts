import "dotenv/config";
import bcrypt from "bcryptjs";
import { User } from "../models";
import { PLATFORM_ROLES } from "../constants/roles";

export async function ensureSuperAdmin(): Promise<void> {
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
    console.warn(
      "⚠️ SUPER_ADMIN_EMAIL or SUPERADMIN_PASSWORD not set. Skipping super admin creation."
    );
    return;
  }

  if (process.env.NODE_ENV === "production" && password === "adminpass123") {
    console.warn("⚠️ Change your SUPERADMIN_PASSWORD in production!");
    return;
  }

  // Prefer checking by role, not email, to guarantee at least one super_admin exists
  const existing = await User.findOne({
    where: { platform_role: PLATFORM_ROLES.SUPER_ADMIN },
  });

  if (existing) {
    console.log("ℹ️ Super admin already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    first_name: firstName,
    last_name: lastName,
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    platform_role: PLATFORM_ROLES.SUPER_ADMIN,
  } as any);

  console.log(`✅ Super admin created with email: ${email}`);
}
