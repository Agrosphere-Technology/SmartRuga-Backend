// src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { PlatformRole } from "../types";

type AccessPayload = { userId: string; platformRole: PlatformRole };

export const requireAuth =
  (platformRoles: PlatformRole[] = []) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];

        // const token = authHeader?.startsWith("Bearer ")
        //   ? authHeader.slice(7).trim()
        //   : null;

        const decoded: any = jwt.verify(
          token,
          process.env.JWT_ACCESS_SECRET!
        ) as AccessPayload;

        const user = await User.findByPk(decoded.userId);

        if (!user) return res.status(401).json({ message: "User not found" });

        // block deactivated / soft-deleted users
        if (user.get("deleted_at")) {
          return res.status(401).json({ message: "Account deactivated" });
        }

        if (user.get("is_active") === false) {
          return res.status(401).json({ message: "Account deactivated" });
        }

        req.user = {
          id: user.get("id") as string,
          email: user.get("email") as string,
          platformRole: user.get("platform_role") as PlatformRole,
          firstName: (user.get("first_name") as string) ?? null,
          lastName: (user.get("last_name") as string) ?? null,
        };

        if (
          platformRoles.length &&
          !platformRoles.includes(req.user.platformRole)
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }

        next();
      } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    };
