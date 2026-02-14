
/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{animalId}/health:
 *   post:
 *     tags: [Livestock]
 *     summary: Add a health event to an animal
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [healthy, sick, recovering, quarantined]
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Animal not found }
 *
 *   get:
 *     tags: [Livestock]
 *     summary: List health events for an animal (latest first)
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
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Animal not found }
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{animalId}/health/latest:
 *   get:
 *     tags: [Livestock]
 *     summary: Get latest health status for an animal
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
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Animal not found }
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{animalId}/health/history:
 *   get:
 *     tags: [Livestock]
 *     summary: Health history timeline (with recorder info) + pagination/filtering
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [healthy, sick, recovering, quarantined]
 *       - in: query
 *         name: from
 *         description: ISO datetime (inclusive)
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         description: ISO datetime (inclusive)
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid query params }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Animal not found }
 */

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    addAnimalHealthEvent,
    getAnimalLatestHealth,
    listAnimalHealth,
    listAnimalHealthHistory,
} from "../controllers/animalHealth.controller";

const router = Router({ mergeParams: true });

// POST/GET simple health events
router.post(
    "/:slug/animals/:animalId/health",
    requireAuth(),
    requireRanchAccess("slug"),
    addAnimalHealthEvent
);

router.get(
    "/:slug/animals/:animalId/health",
    requireAuth(),
    requireRanchAccess("slug"),
    listAnimalHealth
);

// latest
router.get(
    "/:slug/animals/:animalId/health/latest",
    requireAuth(),
    requireRanchAccess("slug"),
    getAnimalLatestHealth
);

// full history (with user info + pagination/filtering)
router.get(
    "/:slug/animals/:animalId/health/history",
    requireAuth(),
    requireRanchAccess("slug"),
    listAnimalHealthHistory
);

export default router;
