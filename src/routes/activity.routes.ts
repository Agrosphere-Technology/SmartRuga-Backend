import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import { listAnimalActivity, listRanchActivity } from "../controllers/activity.controller";

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /api/v1/ranches/{slug}/activity:
 *   get:
 *     tags: [Activity]
 *     summary: Ranch-wide activity feed (audit trail)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: eventType
 *         schema: { type: string, example: animal_update }
 *       - in: query
 *         name: animalId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         description: ISO datetime (inclusive)
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         description: ISO datetime (inclusive)
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ActivityFeedResponse"
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       500: { description: Server error }
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{animalId}/activity:
 *   get:
 *     tags: [Activity]
 *     summary: Animal-specific activity feed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: animalId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnimalActivityFeedResponse"
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Animal not found }
 *       500: { description: Server error }
*/

router.get(
    "/:slug/activity",
    requireAuth(),
    requireRanchAccess("slug"),
    listRanchActivity
);

router.get(
    "/:slug/animals/:animalId/activity",
    requireAuth(),
    requireRanchAccess("slug"),
    listAnimalActivity
);

export default router;