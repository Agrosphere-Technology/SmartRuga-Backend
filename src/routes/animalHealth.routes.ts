// Documentation for Animal Health routes

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
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Animal not found
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
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Animal not found
 */


//  


// Import necessary modules and middlewares

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    addAnimalHealthEvent,
    listAnimalHealthHistory,
} from "../controllers/animalHealth.controller";

const router = Router({ mergeParams: true });

// POST health event
router.post(
    "/:slug/animals/:animalId/health",
    requireAuth(),
    requireRanchAccess("slug"),
    addAnimalHealthEvent
);

// GET health history
router.get(
    "/:slug/animals/:animalId/health",
    requireAuth(),
    requireRanchAccess("slug"),
    listAnimalHealthHistory
);

export default router;
