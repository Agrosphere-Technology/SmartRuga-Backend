import { Request, Response } from "express";
import { User } from "../models";

export async function getMyProfile(req: Request, res: Response) {
  const user = await User.findByPk(req.user!.id, {
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

  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({
    id: user.get("id"),
    firstName: user.get("first_name"),
    lastName: user.get("last_name"),
    email: user.get("email"),
    platformRole: user.get("platform_role"),
    createdAt: user.get("created_at"),
    updatedAt: user.get("updated_at"),
  });
}
