import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { listSpecies } from "../controllers/species.controller";

const router = Router();

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
router.get("/species", requireAuth(), listSpecies);

export default router;
