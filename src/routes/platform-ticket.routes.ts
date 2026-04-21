import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    createPlatformTicket,
    listMyPlatformTickets,
} from "../controllers/platform-ticket.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Platform Tickets
 *     description: Platform support tickets for ranch owners/managers
 *
 * /api/v1/ranches/{slug}/platform-tickets:
 *   get:
 *     tags: [Platform Tickets]
 *     summary: List platform tickets for a ranch
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *
 *   post:
 *     tags: [Platform Tickets]
 *     summary: Create a platform ticket for a ranch
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [support, billing, technical_issue, account_access, feature_request, data_issue, other]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *     responses:
 *       201: { description: Created }
 *       400: { description: Bad request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */

router.get(
    "/ranches/:slug/platform-tickets",
    requireAuth(),
    requireRanchAccess("slug"),
    listMyPlatformTickets
);

router.post(
    "/ranches/:slug/platform-tickets",
    requireAuth(),
    requireRanchAccess("slug"),
    createPlatformTicket
);

export default router;