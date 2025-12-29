// src/middlewares/ranchAccess.ts
import { Request, Response, NextFunction } from "express";
import { Ranch, RanchMember } from "../models";

export type RanchRole = "owner" | "manager" | "vet" | "storekeeper" | "worker";

export const requireRanchAccess =
  (ranchRoles: RanchRole[] = []) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const slug = req.params.slug;
      const ranch = await Ranch.findOne({ where: { slug } });
      if (!ranch) return res.status(404).json({ message: "Ranch not found" });

      const membership = await RanchMember.findOne({
        where: { ranch_id: ranch.get("id"), user_id: req.user.id },
      });

      if (!membership)
        return res.status(403).json({ message: "Not a member of this ranch" });
      if (membership.get("status") !== "active") {
        return res.status(403).json({ message: "Membership not active" });
      }

      req.ranch = {
        id: ranch.get("id") as string,
        slug: ranch.get("slug") as string,
        name: ranch.get("name") as string,
      };

      req.membership = {
        id: membership.get("id") as string,
        ranchRole: membership.get("role") as string,
        status: membership.get("status") as string,
      };

      if (
        ranchRoles.length &&
        !ranchRoles.includes(req.membership.ranchRole as RanchRole)
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (err) {
      return res.status(500).json({ message: "Ranch access check failed" });
    }
  };
