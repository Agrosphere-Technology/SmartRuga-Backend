import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { User, RanchMember, Ranch } from "../models";
import { updateMeSchema } from "../validators/profile.validator";
import { profileMissingFields } from "../helpers/user.helpers";
import { errorResponse, successResponse } from "../utils/apiResponse";

export async function getMyProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const memberships = await RanchMember.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Ranch,
          as: "ranch",
          attributes: ["id", "name", "slug"],
        },
      ],
      attributes: ["id", "role", "ranch_id"],
    } as any);

    const missingFields = profileMissingFields(user);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Profile fetched successfully",
        data: {
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
        },
      })
    );
  } catch (err: any) {
    console.error("GET_ME_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to fetch profile",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function updateMe(req: Request, res: Response) {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid payload",
          errors: parsed.error.issues,
        })
      );
    }

    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
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
          as: "ranch",
          attributes: ["id", "name", "slug"],
        },
      ],
      attributes: ["id", "role", "ranch_id"],
    } as any);

    const missingFields = profileMissingFields(user);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Profile updated successfully",
        data: {
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
        },
      })
    );
  } catch (err: any) {
    console.error("UPDATE_ME_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to update profile",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}