import { Request, Response } from "express";
import crypto from "node:crypto";
import { StatusCodes } from "http-status-codes";

import { Invite, Ranch, RanchMember, User } from "../models";
import { sha256 } from "../utils/crypto";
import { MEMBERSHIP_STATUS, RANCH_ROLES } from "../constants/roles";
import {
  acceptInviteSchema,
  createInviteSchema,
  invitePreviewSchema,
} from "../validators/invite.validator";
import { sendMail } from "../services/mailer.service";
import { inviteEmailTemplate } from "../services/templates/inviteEmail";
import { errorResponse, successResponse } from "../utils/apiResponse";

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:3000";

const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS || 7);
const HIDE_TOKEN_IN_PROD = true;

function isProd() {
  return process.env.NODE_ENV === "production";
}

function makeInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildAcceptUrl(token: string) {
  return `${FRONTEND_BASE_URL}/invites/accept?token=${encodeURIComponent(token)}`;
}

// Create Invite
export async function createInvite(req: Request, res: Response) {
  try {
    const parsed = createInviteSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid payload",
          errors: parsed.error.issues,
        })
      );
    }

    const ranchId = req.ranch!.id;
    const creatorId = req.user!.id;
    const requesterRole = req.membership!.ranchRole;

    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER
    ) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only owner/manager can invite",
        })
      );
    }

    const inviteEmail = parsed.data.email.toLowerCase().trim();
    const role = parsed.data.ranchRole;

    if (role === RANCH_ROLES.OWNER && requesterRole !== RANCH_ROLES.OWNER) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only owner can invite another owner",
        })
      );
    }

    const existingUser = await User.findOne({ where: { email: inviteEmail } });
    if (existingUser) {
      const existingMembership = await RanchMember.findOne({
        where: { ranch_id: ranchId, user_id: existingUser.get("id") },
      });

      if (
        existingMembership &&
        existingMembership.get("status") === MEMBERSHIP_STATUS.ACTIVE
      ) {
        return res.status(StatusCodes.CONFLICT).json(
          errorResponse({
            message: "User is already an active member of this ranch",
          })
        );
      }
    }

    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    const existingInvite = await Invite.findOne({
      where: { ranch_id: ranchId, email: inviteEmail, used_at: null },
    } as any);

    if (existingInvite) {
      return res.status(StatusCodes.CONFLICT).json(
        errorResponse({
          message: "Invite already exists for this email",
        })
      );
    }

    const token = makeInviteToken();
    const tokenHash = sha256(token);

    const invite = await Invite.create({
      ranch_id: ranchId,
      email: inviteEmail,
      role,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: creatorId,
      used_at: null,
      created_at: new Date(),
    } as any);

    if (existingUser) {
      const userId = existingUser.get("id") as string;

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

    const acceptUrl = buildAcceptUrl(token);

    try {
      const ranchName = req.ranch!.name;
      const template = inviteEmailTemplate(ranchName, acceptUrl);

      await sendMail({
        to: inviteEmail,
        subject: template.subject,
        html: template.html,
      });
    } catch (mailErr) {
      console.error("INVITE_EMAIL_ERROR:", mailErr);
    }

    const includeToken = !(HIDE_TOKEN_IN_PROD && isProd());

    return res.status(StatusCodes.CREATED).json(
      successResponse({
        message: "Invite created successfully",
        data: {
          invite: {
            publicId: invite.get("public_id"),
            email: inviteEmail,
            role,
            status: "pending",
            expiresAt: invite.get("expires_at"),
            createdAt: invite.get("created_at"),
          },
          acceptUrl,
          ...(includeToken ? { token } : {}),
        },
      })
    );
  } catch (err: any) {
    console.error("CREATE_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to create invite",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// List Invites
export async function listInvites(req: Request, res: Response) {
  try {
    const requesterRole = req.membership!.ranchRole;

    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER
    ) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only owner/manager can view invites",
        })
      );
    }

    const ranchId = req.ranch!.id;

    const invites = await Invite.findAll({
      where: { ranch_id: ranchId },
      order: [["created_at", "DESC"]],
    } as any);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Invites fetched successfully",
        data: {
          invites: invites.map((i: any) => ({
            publicId: i.get("public_id"),
            email: i.get("email"),
            role: i.get("role"),
            expiresAt: i.get("expires_at"),
            usedAt: i.get("used_at"),
            createdAt: i.get("created_at"),
          })),
        },
      })
    );
  } catch (err: any) {
    console.error("LIST_INVITES_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to list invites",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// Accept Invite
export async function acceptInvite(req: Request, res: Response) {
  try {
    const parsed = acceptInviteSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid payload",
          errors: parsed.error.issues,
        })
      );
    }

    const userId = req.user!.id;
    const token = parsed.data.token;
    const tokenHash = sha256(token);

    const invite = await Invite.findOne({
      where: { token_hash: tokenHash },
    } as any);

    if (!invite) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Invite not found",
        })
      );
    }

    if (invite.get("used_at")) {
      return res.status(StatusCodes.CONFLICT).json(
        errorResponse({
          message: "Invite already used/revoked",
        })
      );
    }

    const expiresAt = invite.get("expires_at") as Date;
    if (expiresAt.getTime() < Date.now()) {
      return res.status(StatusCodes.GONE).json(
        errorResponse({
          message: "Invite expired",
        })
      );
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const inviteEmail = (invite.get("email") as string).toLowerCase();
    const userEmail = (user.get("email") as string).toLowerCase();

    if (inviteEmail !== userEmail) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Invite not meant for this account",
        })
      );
    }

    const ranchId = invite.get("ranch_id") as string;
    const role = invite.get("role") as string;

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

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Invite accepted successfully",
        data: {
          ranchId,
          role,
        },
      })
    );
  } catch (err: any) {
    console.error("ACCEPT_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to accept invite",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// Revoke Invite
export async function revokeInvite(req: Request, res: Response) {
  try {
    const requesterRole = req.membership!.ranchRole;

    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER
    ) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only owner/manager can revoke invites",
        })
      );
    }

    const ranchId = req.ranch!.id;

    const invitePublicId =
      (req.params as any).invitePublicId ||
      (req.params as any).inviteId ||
      (req.params as any).id;

    if (!invitePublicId || typeof invitePublicId !== "string") {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Missing invitePublicId in URL params",
          errors: req.params,
        })
      );
    }

    const invite = await Invite.findOne({
      where: { public_id: invitePublicId, ranch_id: ranchId },
    } as any);

    if (!invite) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Invite not found",
        })
      );
    }

    if (invite.get("used_at")) {
      return res.status(StatusCodes.CONFLICT).json(
        errorResponse({
          message: "Invite already used/revoked",
        })
      );
    }

    await invite.update({ used_at: new Date() });

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Invite revoked successfully",
        data: {
          invite: {
            publicId: invite.get("public_id"),
            email: invite.get("email"),
            role: invite.get("role"),
            usedAt: invite.get("used_at"),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("REVOKE_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to revoke invite",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// Resend invite
export async function resendInvite(req: Request, res: Response) {
  try {
    const requesterRole = req.membership!.ranchRole;

    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER
    ) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only owner/manager can resend invites",
        })
      );
    }

    const ranchId = req.ranch!.id;

    const invitePublicId =
      (req.params as any).invitePublicId ||
      (req.params as any).inviteId ||
      (req.params as any).id;

    if (!invitePublicId) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Missing invitePublicId in URL params",
          errors: req.params,
        })
      );
    }

    const invite = await Invite.findOne({
      where: { public_id: invitePublicId, ranch_id: ranchId },
    } as any);

    if (!invite) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Invite not found",
        })
      );
    }

    if (invite.get("used_at")) {
      return res.status(StatusCodes.CONFLICT).json(
        errorResponse({
          message: "Invite already used/revoked",
        })
      );
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

    const acceptUrl = buildAcceptUrl(token);

    try {
      const ranchName = req.ranch!.name;
      const toEmail = (invite.get("email") as string).toLowerCase();
      const template = inviteEmailTemplate(ranchName, acceptUrl);

      await sendMail({
        to: toEmail,
        subject: template.subject,
        html: template.html,
      });
    } catch (mailErr) {
      console.error("RESEND_INVITE_EMAIL_ERROR:", mailErr);
    }

    const includeToken = !(HIDE_TOKEN_IN_PROD && isProd());

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Invite resent successfully",
        data: {
          invite: {
            publicId: invite.get("public_id"),
            email: invite.get("email"),
            role: invite.get("role"),
            status: "pending",
            expiresAt: invite.get("expires_at"),
          },
          acceptUrl,
          ...(includeToken ? { token } : {}),
        },
      })
    );
  } catch (err: any) {
    console.error("RESEND_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to resend invite",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function previewInvite(req: Request, res: Response) {
  try {
    const parsed = invitePreviewSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid token",
          errors: parsed.error.issues,
        })
      );
    }

    const token = String(parsed.data.token);
    const tokenHash = sha256(token);

    const invite = await Invite.findOne({
      where: { token_hash: tokenHash },
    } as any);

    if (!invite) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Invite not found",
        })
      );
    }

    const expiresAt = invite.get("expires_at") as Date;
    const usedAt = invite.get("used_at") as Date | null;

    const isExpired = expiresAt.getTime() < Date.now();
    const isUsedOrRevoked = Boolean(usedAt);

    const ranchId = invite.get("ranch_id") as string;
    const ranch = await Ranch.findByPk(ranchId);

    if (!ranch) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Ranch not found",
        })
      );
    }

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Invite preview fetched successfully",
        data: {
          invite: {
            email: invite.get("email"),
            role: invite.get("role"),
            expiresAt,
            usedAt,
            status: isUsedOrRevoked ? "used" : isExpired ? "expired" : "pending",
          },
          ranch: {
            slug: ranch.get("slug"),
            name: ranch.get("name"),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("PREVIEW_INVITE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to preview invite",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}