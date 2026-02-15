"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const animalHealth_controller_1 = require("../controllers/animalHealth.controller");
const router = (0, express_1.Router)({ mergeParams: true });
// POST/GET simple health events
router.post("/:slug/animals/:animalId/health", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animalHealth_controller_1.addAnimalHealthEvent);
router.get("/:slug/animals/:animalId/health", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animalHealth_controller_1.listAnimalHealth);
// latest
router.get("/:slug/animals/:animalId/health/latest", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animalHealth_controller_1.getAnimalLatestHealth);
// full history (with user info + pagination/filtering)
router.get("/:slug/animals/:animalId/health/history", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animalHealth_controller_1.listAnimalHealthHistory);
exports.default = router;
