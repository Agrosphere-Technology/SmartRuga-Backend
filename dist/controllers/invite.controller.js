"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvite = createInvite;
exports.listInvites = listInvites;
exports.acceptInvite = acceptInvite;
exports.revokeInvite = revokeInvite;
exports.resendInvite = resendInvite;
const node_crypto_1 = __importDefault(require("node:crypto"));
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
const crypto_1 = require("../utils/crypto");
const invite_validator_1 = require("../validators/invite.validator");
const roles_1 = require("../constants/roles");
const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS || 7);
function makeInviteToken() {
    return node_crypto_1.default.randomBytes(32).toString("hex"); // 64 chars
}
async function createInvite(req, res) {
    try {
        const parsed = invite_validator_1.createInviteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invalid payload", issues: parsed.error.issues });
        }
        // requireRanchAccess already set these
        const ranchId = req.ranch.id;
        const creatorId = req.user.id;
        const requesterRole = req.membership.ranchRole;
        // Only owner/manager can invite
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Only owner/manager can invite" });
        }
        const email = parsed.data.email.toLowerCase().trim();
        const role = parsed.data.ranchRole;
        // ✅ Prevent inviting an existing ACTIVE member
        const existingUser = await models_1.User.findOne({ where: { email } });
        if (existingUser) {
            const existingMembership = await models_1.RanchMember.findOne({
                where: { ranch_id: ranchId, user_id: existingUser.get("id") },
            });
            if (existingMembership &&
                existingMembership.get("status") === roles_1.MEMBERSHIP_STATUS.ACTIVE) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                    message: "User is already an active member of this ranch",
                });
            }
        }
        // optional: prevent inviting someone as owner unless requester is owner
        if (role === roles_1.RANCH_ROLES.OWNER && requesterRole !== roles_1.RANCH_ROLES.OWNER) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Only owner can invite another owner" });
        }
        // expire date
        const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
        // prevent duplicates: if an unused invite exists for same ranch+email, deny
        const existingInvite = await models_1.Invite.findOne({
            where: { ranch_id: ranchId, email, used_at: null },
        });
        if (existingInvite) {
            return res
                .status(http_status_codes_1.StatusCodes.CONFLICT)
                .json({ message: "Invite already exists for this email" });
        }
        // generate token + hash
        const token = makeInviteToken();
        const tokenHash = (0, crypto_1.sha256)(token);
        // create invite
        const invite = await models_1.Invite.create({
            ranch_id: ranchId,
            email,
            role,
            token_hash: tokenHash,
            expires_at: expiresAt,
            created_by: creatorId,
            used_at: null,
            created_at: new Date(),
        });
        // If user already exists, create or update membership as pending
        const user = existingUser; // reuse lookup above
        if (user) {
            const userId = user.get("id");
            const membership = await models_1.RanchMember.findOne({
                where: { ranch_id: ranchId, user_id: userId },
            });
            if (!membership) {
                await models_1.RanchMember.create({
                    ranch_id: ranchId,
                    user_id: userId,
                    role,
                    status: roles_1.MEMBERSHIP_STATUS.PENDING,
                });
            }
            else {
                await membership.update({ role, status: roles_1.MEMBERSHIP_STATUS.PENDING });
            }
        }
        // For now return token so you can test in Postman.
        // Later we email this token link.
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            invite: {
                id: invite.get("id"),
                email,
                role,
                expiresAt: invite.get("expires_at"),
            },
            token,
        });
    }
    catch (err) {
        console.error("CREATE_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to create invite",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
async function listInvites(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        // ✅ type the allowed roles array as RanchRole[]
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Only owner/manager can view invites" });
        }
        const ranchId = req.ranch.id;
        const invites = await models_1.Invite.findAll({
            where: { ranch_id: ranchId },
            order: [["created_at", "DESC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            invites: invites.map((i) => ({
                id: i.get("id"),
                email: i.get("email"),
                role: i.get("role"),
                expiresAt: i.get("expires_at"),
                usedAt: i.get("used_at"),
                createdAt: i.get("created_at"),
            })),
        });
    }
    catch (err) {
        console.error("LIST_INVITES_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list invites",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
async function acceptInvite(req, res) {
    try {
        const parsed = invite_validator_1.acceptInviteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invalid payload", issues: parsed.error.issues });
        }
        const userId = req.user.id;
        const token = parsed.data.token;
        const tokenHash = (0, crypto_1.sha256)(token);
        const invite = await models_1.Invite.findOne({
            where: { token_hash: tokenHash },
        });
        if (!invite)
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Invite not found" });
        if (invite.get("used_at")) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invite already used" });
        }
        const expiresAt = invite.get("expires_at");
        if (expiresAt.getTime() < Date.now()) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invite expired" });
        }
        // Ensure invite email matches logged-in user email
        const user = await models_1.User.findByPk(userId);
        if (!user)
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "User not found" });
        const inviteEmail = invite.get("email").toLowerCase();
        const userEmail = user.get("email").toLowerCase();
        if (inviteEmail !== userEmail) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Invite not meant for this account" });
        }
        const ranchId = invite.get("ranch_id");
        const role = invite.get("role");
        // Activate membership
        const membership = await models_1.RanchMember.findOne({
            where: { ranch_id: ranchId, user_id: userId },
        });
        if (!membership) {
            await models_1.RanchMember.create({
                ranch_id: ranchId,
                user_id: userId,
                role,
                status: roles_1.MEMBERSHIP_STATUS.ACTIVE,
            });
        }
        else {
            await membership.update({ role, status: roles_1.MEMBERSHIP_STATUS.ACTIVE });
        }
        await invite.update({ used_at: new Date() });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Invite accepted",
            ranchId,
            role,
        });
    }
    catch (err) {
        console.error("ACCEPT_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to accept invite",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
async function revokeInvite(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        // Only owner/manager can invite
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Only owner/manager can revoke invites" });
        }
        const ranchId = req.ranch.id;
        const { inviteId } = req.params;
        const invite = await models_1.Invite.findOne({
            where: { id: inviteId, ranch_id: ranchId },
        });
        if (!invite)
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Invite not found" });
        // If already used/revoked
        if (invite.get("used_at")) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invite already used/revoked" });
        }
        await invite.update({ used_at: new Date() });
        return res.status(http_status_codes_1.StatusCodes.OK).json({ message: "Invite revoked" });
    }
    catch (err) {
        console.error("REVOKE_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to revoke invite",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
// Resend invite
async function resendInvite(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        // Only owner/manager can re-invite
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Only owner/manager can resend invites" });
        }
        const ranchId = req.ranch.id;
        const { inviteId } = req.params;
        const invite = await models_1.Invite.findOne({
            where: { id: inviteId, ranch_id: ranchId },
        });
        if (!invite)
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Invite not found" });
        if (invite.get("used_at")) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invite already used/revoked" });
        }
        const token = makeInviteToken();
        const tokenHash = (0, crypto_1.sha256)(token);
        const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
        await invite.update({
            token_hash: tokenHash,
            expires_at: expiresAt,
        });
        // For now, return token for testing; later email it.
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Invite resent",
            invite: {
                id: invite.get("id"),
                email: invite.get("email"),
                role: invite.get("role"),
                expiresAt: invite.get("expires_at"),
            },
            token,
        });
    }
    catch (err) {
        console.error("RESEND_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to resend invite",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
