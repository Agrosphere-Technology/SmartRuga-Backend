import { Request, Response, NextFunction } from "express";
import { Ranch, RanchMember } from "../models";
import { StatusCodes } from "http-status-codes";
import { MEMBERSHIP_STATUS } from "../constants/roles";

export const requireRanchAccess =
  (slugParam = "slug") =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params[slugParam];
      const userId = req.user!.id;

      const ranch = await Ranch.findOne({ where: { slug } });
      if (!ranch) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Ranch not found" });
      }

      const membership = await RanchMember.findOne({
        where: { ranch_id: ranch.get("id"), user_id: userId },
      });

      if (!membership) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Access denied" });
      }

      if (membership.get("status") !== MEMBERSHIP_STATUS.ACTIVE) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Membership not active" });
      }

      req.ranch = {
        id: ranch.get("id") as string,
        slug: ranch.get("slug") as string,
        name: ranch.get("name") as string,
      };

      req.membership = {
        id: membership.get("id") as string,
        ranchRole: membership.get("role") as any,
        status: membership.get("status") as any,
      };

      return next();
    } catch (err: any) {
      console.error("RANCH_ACCESS_ERROR:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to resolve ranch access",
        error: err?.message ?? "Unknown error",
      });
    }
  };
