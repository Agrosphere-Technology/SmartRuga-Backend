"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const animalMovement_controller_1 = require("../controllers/animalMovement.controller");
const router = (0, express_1.Router)({ mergeParams: true });
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
router.post("/:slug/animals/:id/movements", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animalMovement_controller_1.createAnimalMovement);
router.get("/:slug/animals/:id/movements", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animalMovement_controller_1.listAnimalMovements);
exports.default = router;
