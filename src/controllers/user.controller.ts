import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { User, RanchMember, Ranch } from "../models";
import { updateMeSchema } from "../validators/profile.validator";
import { profileMissingFields } from "../helpers/user.helpers";

export async function getMyProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const memberships = await RanchMember.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Ranch,
          as: "ranch", // use your real alias here
          attributes: ["id", "name", "slug"],
        },
      ],
      attributes: ["id", "role", "ranch_id"],
    } as any);

    const missingFields = profileMissingFields(user);

    return res.status(StatusCodes.OK).json({
      user: {
        email: user.get("email"),
        first_name: user.get("first_name"),
        last_name: user.get("last_name"),
        phone: user.get("phone"),
        platform_role: user.get("platform_role"),
        is_active: user.get("is_active"),
        createdAt: user.get("created_at"),
      },
      memberships: memberships.map((membership: any) => ({
        ranchId: membership.get("ranch_id"),
        ranchName: membership.ranch?.get("name") ?? null,
        ranchSlug: membership.ranch?.get("slug") ?? null,
        role: membership.get("role"),
      })),
      profileComplete: missingFields.length === 0,
      missingFields,
    });
  } catch (err: any) {
    console.error("GET_ME_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch profile",
      error: err?.message ?? "Unknown error",
    });
  }
}

export async function updateMe(req: Request, res: Response) {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid payload",
        issues: parsed.error.issues,
      });
    }

    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const { first_name, last_name, phone } = parsed.data;

    await user.update({
      ...(first_name !== undefined ? { first_name } : {}),
      ...(last_name !== undefined ? { last_name } : {}),
      ...(phone !== undefined ? { phone } : {}),
    });

    const memberships = await RanchMember.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Ranch,
          as: "ranch", // use your real alias here
          attributes: ["id", "name", "slug"],
        },
      ],
      attributes: ["id", "role", "ranch_id"],
    } as any);

    const missingFields = profileMissingFields(user);

    return res.status(StatusCodes.OK).json({
      message: "Profile updated",
      user: {
        email: user.get("email"),
        first_name: user.get("first_name"),
        last_name: user.get("last_name"),
        phone: user.get("phone"),
        platform_role: user.get("platform_role"),
        is_active: user.get("is_active"),
        createdAt: user.get("created_at"),
      },
      memberships: memberships.map((membership: any) => ({
        ranchId: membership.get("ranch_id"),
        ranchName: membership.ranch?.get("name") ?? null,
        ranchSlug: membership.ranch?.get("slug") ?? null,
        role: membership.get("role"),
      })),
      profileComplete: missingFields.length === 0,
      missingFields,
    });
  } catch (err: any) {
    console.error("UPDATE_ME_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update profile",
      error: err?.message ?? "Unknown error",
    });
  }
}