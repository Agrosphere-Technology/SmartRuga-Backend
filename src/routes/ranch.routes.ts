// Documentation for Ranch routes

/**
 * @openapi
 * tags:
 *   - name: Ranches
 *     description: Ranch workspaces and membership access
 *
 * /api/v1/ranches:
 *   post:
 *     tags: [Ranches]
 *     summary: Create a ranch (admin/super_admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RanchCreateRequest' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/RanchResponse' } } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *
 *   get:
 *     tags: [Ranches]
 *     summary: List ranches current user belongs to
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ranches:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/RanchSummary' }
 *
 * /api/v1/ranches/{slug}:
 *   get:
 *     tags: [Ranches]
 *     summary: Get ranch by slug (member only)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/RanchResponse' } } } }
 *       403: { description: Access denied }
 *       404: { description: Ranch not found }
 */

// Import necessary modules and middlewares

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  createRanch,
  getRanchBySlug,
  listAllRanches,
} from "../controllers/ranch.controller";
import { PLATFORM_ROLES } from "../constants/roles";

const router = Router();

// create ranch
router.post(
  "/",
  requireAuth([PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.SUPER_ADMIN]),
  createRanch
);

// list ranches user belongs to
router.get("/", requireAuth(), listAllRanches);

// get ranch by slug
router.get("/:slug", requireAuth(), getRanchBySlug);

export default router;
