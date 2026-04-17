"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const species_controller_1 = require("../controllers/species.controller");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/species:
 *   get:
 *     tags: [Species]
 *     summary: List all species
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Species fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/species", (0, auth_1.requireAuth)(), species_controller_1.listSpecies);
/**
 * @openapi
 * /api/v1/species:
 *   post:
 *     tags: [Species]
 *     summary: Create species
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Species created successfully
 *       403:
 *         description: Forbidden
 */
router.post("/species", (0, auth_1.requireAuth)(), species_controller_1.createSpecies);
/**
 * @openapi
 * /api/v1/species/{speciesId}:
 *   patch:
 *     tags: [Species]
 *     summary: Update species
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: speciesId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Species updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Species not found
 */
router.patch("/species/:speciesId", (0, auth_1.requireAuth)(), species_controller_1.updateSpecies);
/**
 * @openapi
 * /api/v1/species/{speciesId}:
 *   delete:
 *     tags: [Species]
 *     summary: Delete species
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: speciesId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Species deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Species not found
 */
router.delete("/species/:speciesId", (0, auth_1.requireAuth)(), species_controller_1.deleteSpecies);
exports.default = router;
