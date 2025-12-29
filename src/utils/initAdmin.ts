import bcrypt from "bcryptjs";
import { User } from "../models";
import { PLATFORM_ROLES } from "../constants/roles";

export async function ensureSuperAdmin(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  const firstName = process.env.SUPERADMIN_FIRST_NAME || "Super";
  const lastName = process.env.SUPERADMIN_LAST_NAME || "Admin";

  if (!email || !password) {
    console.warn(
      "⚠️ SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set. Skipping super admin creation."
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
