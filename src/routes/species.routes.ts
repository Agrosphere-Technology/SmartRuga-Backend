import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
    createSpecies,
    deleteSpecies,
    listSpecies,
    updateSpecies,
} from "../controllers/species.controller";

const router = Router();

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
router.get("/species", requireAuth(), listSpecies);

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
router.post("/species", requireAuth(), createSpecies);

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
router.patch("/species/:speciesId", requireAuth(), updateSpecies);

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
router.delete("/species/:speciesId", requireAuth(), deleteSpecies);

export default router;