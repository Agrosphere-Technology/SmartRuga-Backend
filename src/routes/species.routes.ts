import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { listSpecies } from "../controllers/species.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/species:
 *   get:
 *     tags: [Livestock]
 *     summary: List all species (for dropdowns)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 species:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Species"
 *       401:
 *         description: Unauthorized
 */

router.get("/species", requireAuth(), listSpecies);

export default router;
