import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    createAnimalMovement,
    listAnimalMovements,
} from "../controllers/animalMovement.controller";

const router = Router({ mergeParams: true });

/**
 * @openapi
 * tags:
 *   - name: Animal Movement
 *     description: Animal movement tracking within a ranch
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateAnimalMovementRequest:
 *       type: object
 *       required:
 *         - movementType
 *       properties:
 *         movementType:
 *           type: string
 *           enum: [to_pasture, to_quarantine, to_barn, to_market, returned]
 *         fromLocation:
 *           type: string
 *           nullable: true
 *         toLocation:
 *           type: string
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{id}/movements:
 *   post:
 *     tags: [Animal Movement]
 *     summary: Record movement for an animal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAnimalMovementRequest'
 *     responses:
 *       201:
 *         description: Movement recorded
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
 *     tags: [Animal Movement]
 *     summary: List movement history for an animal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Movement history
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Animal not found
 */
router.post(
    "/:slug/animals/:id/movements",
    requireAuth(),
    requireRanchAccess("slug"),
    createAnimalMovement
);

router.get(
    "/:slug/animals/:id/movements",
    requireAuth(),
    requireRanchAccess("slug"),
    listAnimalMovements
);

export default router;