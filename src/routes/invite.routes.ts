// Documentation for API endpoint to accept an invite

/**
 * @openapi
 * /api/v1/invites/accept:
 *   post:
 *     tags: [Invites]
 *     summary: Accept an invite (requires auth)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AcceptInviteRequest' }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/AcceptInviteResponse' } } } }
 *       401: { description: Unauthorized }
 *       403: { description: Invite not meant for this user }
 *       404: { description: Invite not found }
 */

// Import necessary modules and middlewares

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { acceptInvite } from "../controllers/invite.controller";

const router = Router();

// Accept invite (token from email/link)
router.post("/accept", requireAuth(), acceptInvite);

export default router;
