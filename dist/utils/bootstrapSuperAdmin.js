"use strict";
// I decided to stick with ensureSuperAdmin in initAdmin.ts for clarity and consistency.
// import bcrypt from "bcrypt";
// import { User } from "../models";
// function isProd() {
//   return process.env.NODE_ENV === "production";
// }
// export async function bootstrapSuperAdmin(): Promise<void> {
//   const email = process.env.SUPER_ADMIN_EMAIL;
//   const password = process.env.SUPER_ADMIN_PASSWORD;
//   // In production, do NOT allow missing credentials
//   if (isProd() && (!email || !password)) {
//     console.warn(
//       "⚠️ SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set. Super admin NOT created."
//     );
//     return;
//   }
//   // In dev, allow safe defaults (optional)
//   const devEmail = email || "superadmin@smartruga.local";
//   const devPassword = password || "ChangeMe123!";
//   if (isProd() && password === "ChangeMe123!") {
//     console.warn(
//       "⚠️ Refusing to use default SUPER_ADMIN_PASSWORD in production."
//     );
//     return;
//   }
//   // Check if a super admin already exists
//   const existing = await User.findOne({
//     where: { platform_role: "super_admin" },
//   });
//   if (existing) {
//     return;
//   }
//   // If you prefer: only bootstrap when there are 0 users
//   // const count = await User.count();
//   // if (count > 0) return;
//   const password_hash = await bcrypt.hash(devPassword, 12);
//   await User.create({
//     first_name: "Super",
//     last_name: "Admin",
//     email: devEmail.toLowerCase(),
//     password_hash,
//     platform_role: "super_admin",
//   } as any);
//   console.log(`✅ Super admin created: ${devEmail}`);
// }
