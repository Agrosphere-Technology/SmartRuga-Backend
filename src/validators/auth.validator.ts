import { z } from "zod";
import { PLATFORM_ROLES } from "../constants/roles";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateRoleSchema = z.object({
  platformRole: z.enum([
    PLATFORM_ROLES.USER,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPER_ADMIN,
  ]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
