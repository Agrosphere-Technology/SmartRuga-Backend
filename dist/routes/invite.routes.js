"use strict";
// Documentation for API endpoint to accept an invite
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const invite_controller_1 = require("../controllers/invite.controller");
const router = (0, express_1.Router)();
// Accept invite (token from email/link)
router.post("/accept", (0, auth_1.requireAuth)(), invite_controller_1.acceptInvite);
exports.default = router;
