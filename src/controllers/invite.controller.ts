import { Request, Response } from "express";
import crypto from "node:crypto";
import { StatusCodes } from "http-status-codes";

import { Invite, RanchMember, User } from "../models";
import { sha256 } from "../utils/crypto";
import {
  createInviteSchema,
  acceptInviteSchema,
} from "../validators/invite.validator";
import { MEMBERSHIP_STATUS, RANCH_ROLES, RanchRole } from "../constants/roles";

const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS || 7);

function makeInviteToken() {
  return crypto.randomBytes(32).toString("hex"); // 64 chars
}

export async function createInvite(req: Request, res: Response) {
  try {
    const parsed = createInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid payload", issues: parsed.error.issues });
    }

    // requireRanchAccess already set these
    const ranchId = req.ranch!.id;
    const creatorId = req.user!.id;

    const requesterRole = req.membership!.ranchRole;

    // Only owner/manager can invite
    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER
    ) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Only owner/manager can invite" });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const role = parsed.data.ranchRole;

    // ✅ Prevent inviting an existing ACTIVE member
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const existingMembership = await RanchMember.findOne({
        where: { ranch_id: ranchId, user_id: existingUser.get("id") },
      });

      if (
        existingMembership &&
        existingMembership.get("status") === MEMBERSHIP_STATUS.ACTIVE
      ) {
        return res.status(StatusCodes.CONFLICT).json({
          message: "User is already an active member of this ranch",
        });
      }
    }

    // optional: prevent inviting someone as owner unless requester is owner
    if (role === RANCH_ROLES.OWNER && requesterRole !== RANCH_ROLES.OWNER) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Only owner can invite another owner" });
    }

    // expire date
    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    // prevent duplicates: if an unused invite exists for same ranch+email, deny
    const existingInvite = await Invite.findOne({
      where: { ranch_id: ranchId, email, used_at: null },
    } as any);

    if (existingInvite) {
      return res
        .status(StatusCodes.CONFLICT)
        .json({ message: "Invite already exists for this email" });
    }

    // generate token + hash
    const token = makeInviteToken();
    const tokenHash = sha256(token);

    // create invite
    const invite = await Invite.create({
      ranch_id: ranchId,
      email,
      role,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: creatorId,
      used_at: null,
      created_at: new Date(),
    } as any);

    // If user already exists, create or update membership as pending
    const user = existingUser; // reuse lookup above
    if (user) {
      const userId = user.get("id") as string;

      const membership = await RanchMember.findOne({
        where: { ranch_id: ranchId, user_id: userId },
      });

      if (!membership) {
        await RanchMember.create({
          ranch_id: ranchId,
          user_id: userId,
          role,
          status: MEMBERSHIP_STATUS.PENDING,
        } as any);
      } else {
        await membership.update({ role, status: MEMBERSHIP_STATUS.PENDING });
      }
    }

    // For now return token so you can test in Postman.
    // Later we email this token link.
    return res.status(StatusCodes.CREATED).json({
      invite: {
        id: invite.get("id"),
        email,
        role,
        expiresAt: invite.get("expires_at"),
      },
      token,
    });
  } catch (err: any) {
    console.error("CREATE_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to create invite",
      error: err?.message ?? "Unknown error",
      details: err?.errors ?? null,
    });
  }
}

export async function listInvites(req: Request, res: Response) {
  try {
    const requesterRole = req.membership!.ranchRole;

    // ✅ type the allowed roles array as RanchRole[]

    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER
    ) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Only owner/manager can view invites" });
    }

    const ranchId = req.ranch!.id;

    const invites = await Invite.findAll({
      where: { ranch_id: ranchId },
      order: [["created_at", "DESC"]],
    } as any);

    return res.status(StatusCodes.OK).json({
      invites: invites.map((i: any) => ({
        id: i.get("id"),
        email: i.get("email"),
        role: i.get("role"),
        expiresAt: i.get("expires_at"),
        usedAt: i.get("used_at"),
        createdAt: i.get("created_at"),
      })),
    });
  } catch (err: any) {
    console.error("LIST_INVITES_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to list invites",
      error: err?.message ?? "Unknown error",
      details: err?.errors ?? null,
    });
  }
}

export async function acceptInvite(req: Request, res: Response) {
  try {
    const parsed = acceptInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid payload", issues: parsed.error.issues });
    }

    const userId = req.user!.id;
    const token = parsed.data.token;

    const tokenHash = sha256(token);

    const invite = await Invite.findOne({
      where: { token_hash: tokenHash },
    } as any);
    if (!invite)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Invite not found" });

    if (invite.get("used_at")) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invite already used" });
    }

    const expiresAt = invite.get("expires_at") as Date;
    if (expiresAt.getTime() < Date.now()) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invite expired" });
    }

    // Ensure invite email matches logged-in user email
    const user = await User.findByPk(userId);
    if (!user)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found" });

    const inviteEmail = (invite.get("email") as string).toLowerCase();
    const userEmail = (user.get("email") as string).toLowerCase();

    if (inviteEmail !== userEmail) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Invite not meant for this account" });
    }

    const ranchId = invite.get("ranch_id") as string;
    const role = invite.get("role") as string;

    // Activate membership
    const membership = await RanchMember.findOne({
      where: { ranch_id: ranchId, user_id: userId },
    });
    if (!membership) {
      await RanchMember.create({
        ranch_id: ranchId,
        user_id: userId,
        role,
        status: MEMBERSHIP_STATUS.ACTIVE,
      } as any);
    } else {
      await membership.update({ role, status: MEMBERSHIP_STATUS.ACTIVE });
    }

    await invite.update({ used_at: new Date() });

    return res.status(StatusCodes.OK).json({
      message: "Invite accepted",
      ranchId,
      role,
    });
  } catch (err: any) {
    console.error("ACCEPT_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to accept invite",
      error: err?.message ?? "Unknown error",
      details: err?.errors ?? null,
    });
  }
}

export async function revokeInvite(req: Request, res: Response) {
  try {
    const requesterRole = req.membership!.ranchRole;
    // Only owner/manager can invite
    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER
    ) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Only owner/manager can revoke invites" });
    }

    const ranchId = req.ranch!.id;
    const { inviteId } = req.params;

    const invite = await Invite.findOne({
      where: { id: inviteId, ranch_id: ranchId },
    } as any);
    if (!invite)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Invite not found" });

    // If already used/revoked
    if (invite.get("used_at")) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invite already used/revoked" });
    }

    await invite.update({ used_at: new Date() });

    return res.status(StatusCodes.OK).json({ message: "Invite revoked" });
  } catch (err: any) {
    console.error("REVOKE_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to revoke invite",
      error: err?.message ?? "Unknown error",
      details: err?.errors ?? null,
    });
  }
}

// Resend invite
export async function resendInvite(req: Request, res: Response) {
  try {
    const requesterRole = req.membership!.ranchRole;
    // Only owner/manager can re-invite
    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER
    ) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Only owner/manager can resend invites" });
    }

    const ranchId = req.ranch!.id;
    const { inviteId } = req.params;

    const invite = await Invite.findOne({
      where: { id: inviteId, ranch_id: ranchId },
    } as any);
    if (!invite)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Invite not found" });

    if (invite.get("used_at")) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invite already used/revoked" });
    }

    const token = makeInviteToken();
    const tokenHash = sha256(token);

    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    await invite.update({
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    // For now, return token for testing; later email it.
    return res.status(StatusCodes.OK).json({
      message: "Invite resent",
      invite: {
        id: invite.get("id"),
        email: invite.get("email"),
        role: invite.get("role"),
        expiresAt: invite.get("expires_at"),
      },
      token,
    });
  } catch (err: any) {
    console.error("RESEND_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to resend invite",
      error: err?.message ?? "Unknown error",
      details: err?.errors ?? null,
    });
  }
}
