import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import { getRanchDashboard } from "../controllers/dashboard.controller";

const router = Router();


/**
 * @openapi
 * /api/v1/ranches/{slug}/dashboard:
 *   get:
 *     summary: Get ranch dashboard overview
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ranch dashboard returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

router.get(
    "/:slug/dashboard",
    requireAuth(),
    requireRanchAccess("slug"),
    getRanchDashboard
);

export default router;