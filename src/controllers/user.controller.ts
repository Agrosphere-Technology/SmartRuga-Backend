import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { User } from "../models";

export async function getMyProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "platform_role",
        "created_at",
        "updated_at",
      ],
    });

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    return res.status(StatusCodes.OK).json({
      id: user.get("id"),
      firstName: user.get("first_name"),
      lastName: user.get("last_name"),
      email: user.get("email"),
      platformRole: user.get("platform_role"),
      createdAt: user.get("created_at"),
      updatedAt: user.get("updated_at"),
    });
  } catch (err: any) {
    console.error("GET_PROFILE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch profile",
      error: err?.message ?? "Unknown error",
      details: err?.errors ?? null,
    });
  }
}
