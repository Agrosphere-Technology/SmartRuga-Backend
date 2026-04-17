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
exports.previewInvite = previewInvite;
const node_crypto_1 = __importDefault(require("node:crypto"));
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
const crypto_1 = require("../utils/crypto");
const roles_1 = require("../constants/roles");
const invite_validator_1 = require("../validators/invite.validator");
const mailer_service_1 = require("../services/mailer.service");
const inviteEmail_1 = require("../services/templates/inviteEmail");
const apiResponse_1 = require("../utils/apiResponse");
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS || 7);
const HIDE_TOKEN_IN_PROD = true;
function isProd() {
    return process.env.NODE_ENV === "production";
}
function makeInviteToken() {
    return node_crypto_1.default.randomBytes(32).toString("hex");
}
function buildAcceptUrl(token) {
    return `${FRONTEND_BASE_URL}/invites/accept?token=${encodeURIComponent(token)}`;
}
// Create Invite
async function createInvite(req, res) {
    try {
        const parsed = invite_validator_1.createInviteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const ranchId = req.ranch.id;
        const creatorId = req.user.id;
        const requesterRole = req.membership.ranchRole;
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager can invite",
            }));
        }
        const inviteEmail = parsed.data.email.toLowerCase().trim();
        const role = parsed.data.ranchRole;
        if (role === roles_1.RANCH_ROLES.OWNER && requesterRole !== roles_1.RANCH_ROLES.OWNER) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner can invite another owner",
            }));
        }
        const existingUser = await models_1.User.findOne({ where: { email: inviteEmail } });
        if (existingUser) {
            const existingMembership = await models_1.RanchMember.findOne({
                where: { ranch_id: ranchId, user_id: existingUser.get("id") },
            });
            if (existingMembership &&
                existingMembership.get("status") === roles_1.MEMBERSHIP_STATUS.ACTIVE) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                    message: "User is already an active member of this ranch",
                }));
            }
        }
        const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
        const existingInvite = await models_1.Invite.findOne({
            where: { ranch_id: ranchId, email: inviteEmail, used_at: null },
        });
        if (existingInvite) {
            return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                message: "Invite already exists for this email",
            }));
        }
        const token = makeInviteToken();
        const tokenHash = (0, crypto_1.sha256)(token);
        const invite = await models_1.Invite.create({
            ranch_id: ranchId,
            email: inviteEmail,
            role,
            token_hash: tokenHash,
            expires_at: expiresAt,
            created_by: creatorId,
            used_at: null,
            created_at: new Date(),
        });
        if (existingUser) {
            const userId = existingUser.get("id");
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
        const acceptUrl = buildAcceptUrl(token);
        try {
            const ranchName = req.ranch.name;
            const template = (0, inviteEmail_1.inviteEmailTemplate)(ranchName, acceptUrl);
            await (0, mailer_service_1.sendMail)({
                to: inviteEmail,
                subject: template.subject,
                html: template.html,
            });
        }
        catch (mailErr) {
            console.error("INVITE_EMAIL_ERROR:", mailErr);
        }
        const includeToken = !(HIDE_TOKEN_IN_PROD && isProd());
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
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
        }));
    }
    catch (err) {
        console.error("CREATE_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to create invite",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// List Invites
async function listInvites(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager can view invites",
            }));
        }
        const ranchId = req.ranch.id;
        const invites = await models_1.Invite.findAll({
            where: { ranch_id: ranchId },
            order: [["created_at", "DESC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Invites fetched successfully",
            data: {
                invites: invites.map((i) => ({
                    publicId: i.get("public_id"),
                    email: i.get("email"),
                    role: i.get("role"),
                    expiresAt: i.get("expires_at"),
                    usedAt: i.get("used_at"),
                    createdAt: i.get("created_at"),
                })),
            },
        }));
    }
    catch (err) {
        console.error("LIST_INVITES_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list invites",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Accept Invite
async function acceptInvite(req, res) {
    try {
        const parsed = invite_validator_1.acceptInviteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const userId = req.user.id;
        const token = parsed.data.token;
        const tokenHash = (0, crypto_1.sha256)(token);
        const invite = await models_1.Invite.findOne({
            where: { token_hash: tokenHash },
        });
        if (!invite) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Invite not found",
            }));
        }
        if (invite.get("used_at")) {
            return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                message: "Invite already used/revoked",
            }));
        }
        const expiresAt = invite.get("expires_at");
        if (expiresAt.getTime() < Date.now()) {
            return res.status(http_status_codes_1.StatusCodes.GONE).json((0, apiResponse_1.errorResponse)({
                message: "Invite expired",
            }));
        }
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "User not found",
            }));
        }
        const inviteEmail = invite.get("email").toLowerCase();
        const userEmail = user.get("email").toLowerCase();
        if (inviteEmail !== userEmail) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Invite not meant for this account",
            }));
        }
        const ranchId = invite.get("ranch_id");
        const role = invite.get("role");
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
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Invite accepted successfully",
            data: {
                ranchId,
                role,
            },
        }));
    }
    catch (err) {
        console.error("ACCEPT_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to accept invite",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Revoke Invite
async function revokeInvite(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager can revoke invites",
            }));
        }
        const ranchId = req.ranch.id;
        const invitePublicId = req.params.invitePublicId ||
            req.params.inviteId ||
            req.params.id;
        if (!invitePublicId || typeof invitePublicId !== "string") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Missing invitePublicId in URL params",
                errors: req.params,
            }));
        }
        const invite = await models_1.Invite.findOne({
            where: { public_id: invitePublicId, ranch_id: ranchId },
        });
        if (!invite) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Invite not found",
            }));
        }
        if (invite.get("used_at")) {
            return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                message: "Invite already used/revoked",
            }));
        }
        await invite.update({ used_at: new Date() });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Invite revoked successfully",
            data: {
                invite: {
                    publicId: invite.get("public_id"),
                    email: invite.get("email"),
                    role: invite.get("role"),
                    usedAt: invite.get("used_at"),
                },
            },
        }));
    }
    catch (err) {
        console.error("REVOKE_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to revoke invite",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Resend invite
async function resendInvite(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager can resend invites",
            }));
        }
        const ranchId = req.ranch.id;
        const invitePublicId = req.params.invitePublicId ||
            req.params.inviteId ||
            req.params.id;
        if (!invitePublicId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Missing invitePublicId in URL params",
                errors: req.params,
            }));
        }
        const invite = await models_1.Invite.findOne({
            where: { public_id: invitePublicId, ranch_id: ranchId },
        });
        if (!invite) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Invite not found",
            }));
        }
        if (invite.get("used_at")) {
            return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                message: "Invite already used/revoked",
            }));
        }
        const token = makeInviteToken();
        const tokenHash = (0, crypto_1.sha256)(token);
        const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
        await invite.update({
            token_hash: tokenHash,
            expires_at: expiresAt,
        });
        const acceptUrl = buildAcceptUrl(token);
        try {
            const ranchName = req.ranch.name;
            const toEmail = invite.get("email").toLowerCase();
            const template = (0, inviteEmail_1.inviteEmailTemplate)(ranchName, acceptUrl);
            await (0, mailer_service_1.sendMail)({
                to: toEmail,
                subject: template.subject,
                html: template.html,
            });
        }
        catch (mailErr) {
            console.error("RESEND_INVITE_EMAIL_ERROR:", mailErr);
        }
        const includeToken = !(HIDE_TOKEN_IN_PROD && isProd());
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
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
        }));
    }
    catch (err) {
        console.error("RESEND_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to resend invite",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function previewInvite(req, res) {
    try {
        const parsed = invite_validator_1.invitePreviewSchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid token",
                errors: parsed.error.issues,
            }));
        }
        const token = String(parsed.data.token);
        const tokenHash = (0, crypto_1.sha256)(token);
        const invite = await models_1.Invite.findOne({
            where: { token_hash: tokenHash },
        });
        if (!invite) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Invite not found",
            }));
        }
        const expiresAt = invite.get("expires_at");
        const usedAt = invite.get("used_at");
        const isExpired = expiresAt.getTime() < Date.now();
        const isUsedOrRevoked = Boolean(usedAt);
        const ranchId = invite.get("ranch_id");
        const ranch = await models_1.Ranch.findByPk(ranchId);
        if (!ranch) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Ranch not found",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
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
        }));
    }
    catch (err) {
        console.error("PREVIEW_INVITE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to preview invite",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
