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
 *     tags: [Livestock]
 *     summary: List supported species (for animal creation forms)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Species list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 species:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Species'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/species", (0, auth_1.requireAuth)(), species_controller_1.listSpecies);
exports.default = router;
