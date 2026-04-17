"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const activity_controller_1 = require("../controllers/activity.controller");
const router = (0, express_1.Router)({ mergeParams: true });
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
router.get("/:slug/activity", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), activity_controller_1.listRanchActivity);
router.get("/:slug/animals/:animalId/activity", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), activity_controller_1.listAnimalActivity);
exports.default = router;
