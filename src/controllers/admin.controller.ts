import { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models";
import { PLATFORM_ROLES } from "../constants/roles";
import { stat } from "node:fs";
import { StatusCodes } from "http-status-codes";
import { updateRoleSchema } from "../validators/auth.validator";

export async function updateUserPlatformRole(req: Request, res: Response) {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid platformRole", issues: parsed.error.issues });
  }

  const targetUserId = req.params.id;
  const newRole = parsed.data
    .platformRole as (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

  // requester is already set by requireAuth()
  const requester = req.user!;
  const requesterRole = requester.platformRole;

  const target = await User.findByPk(targetUserId);
  if (!target)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "User not found" });

  const targetRole = target.get(
    "platform_role"
  ) as (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

  // Protect super_admin from being modified
  if (targetRole === PLATFORM_ROLES.SUPER_ADMIN) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ message: "Cannot modify a super_admin" });
  }

  // Only super_admin can assign super_admin
  if (
    newRole === PLATFORM_ROLES.SUPER_ADMIN &&
    requesterRole !== PLATFORM_ROLES.SUPER_ADMIN
  ) {
    return res
      .status(403)
      .json({ message: "Only super_admin can assign super_admin role" });
  }

  // Admins should not modify other admins (optional policy)
  if (
    requesterRole === PLATFORM_ROLES.ADMIN &&
    targetRole === PLATFORM_ROLES.ADMIN
  ) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ message: "Admins cannot change other admins" });
  }

  await target.update({ platform_role: newRole });

  return res.json({
    id: target.get("id"),
    email: target.get("email"),
    platformRole: target.get("platform_role"),
  });
}
