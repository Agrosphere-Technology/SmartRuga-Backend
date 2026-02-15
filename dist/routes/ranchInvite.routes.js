"use strict";
// Documentation for Ranch Invite routes
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @openapi
 * tags:
 *   - name: Invites
 *     description: Ranch invite lifecycle (create/list/resend/revoke/accept)
 *
 * /api/v1/ranches/{slug}/invites:
 *   post:
 *     tags: [Invites]
 *     summary: Create invite for a ranch (owner/manager only)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/InviteCreateRequest' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/InviteCreateResponse' } } } }
 *       403: { description: Forbidden }
 *       409: { description: Conflict }
 *
 *   get:
 *     tags: [Invites]
 *     summary: List invites for a ranch (owner/manager only)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invites:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/InviteSummary' }
 *
 * /api/v1/ranches/{slug}/invites/{inviteId}:
 *   delete:
 *     tags: [Invites]
 *     summary: Revoke an invite (owner/manager only)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Invite revoked }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *
 * /api/v1/ranches/{slug}/invites/{inviteId}/resend:
 *   post:
 *     tags: [Invites]
 *     summary: Resend invite (rotates token + extends expiry)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Invite resent, content: { application/json: { schema: { $ref: '#/components/schemas/InviteCreateResponse' } } } }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// Import necessary modules and middlewares
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const invite_controller_1 = require("../controllers/invite.controller");
// Merge params to access :slug from parent routes
const router = (0, express_1.Router)({ mergeParams: true });
// Create a new invite for a ranch
router.post("/:slug/invites", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), invite_controller_1.createInvite);
// List invites for a ranch
router.get("/:slug/invites", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), invite_controller_1.listInvites);
// Revoke an invite
router.delete("/:slug/invites/:inviteId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), invite_controller_1.revokeInvite);
// Resend an invite
router.post("/:slug/invites/:inviteId/resend", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), invite_controller_1.resendInvite);
exports.default = router;
