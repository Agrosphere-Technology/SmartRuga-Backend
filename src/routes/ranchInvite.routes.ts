// Documentation for Ranch Invite routes

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

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
  createInvite,
  listInvites,
  resendInvite,
  revokeInvite,
} from "../controllers/invite.controller";

// Merge params to access :slug from parent routes
const router = Router({ mergeParams: true });

// Create a new invite for a ranch
router.post(
  "/:slug/invites",
  requireAuth(),
  requireRanchAccess("slug"),
  createInvite
);

// List invites for a ranch
router.get(
  "/:slug/invites",
  requireAuth(),
  requireRanchAccess("slug"),
  listInvites
);

// Revoke an invite
router.delete(
  "/:slug/invites/:inviteId",
  requireAuth(),
  requireRanchAccess("slug"),
  revokeInvite
);

// Resend an invite
router.post(
  "/:slug/invites/:inviteId/resend",
  requireAuth(),
  requireRanchAccess("slug"),
  resendInvite
);

export default router;
