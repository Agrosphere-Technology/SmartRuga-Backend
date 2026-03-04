import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    createAnimalVaccination,
    listAnimalVaccinations,
    listOverdueVaccinations,
} from "../controllers/vaccination.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Vaccinations
 *     description: Animal vaccination records and schedules
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Vaccination:
 *       type: object
 *       properties:
 *         publicId:
 *           type: string
 *           format: uuid
 *         vaccineName:
 *           type: string
 *         dose:
 *           type: string
 *           nullable: true
 *         administeredAt:
 *           type: string
 *           format: date-time
 *         nextDueAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *
 *     CreateVaccinationRequest:
 *       type: object
 *       required:
 *         - vaccineName
 *       properties:
 *         vaccineName:
 *           type: string
 *           example: "CBPP Vaccine"
 *         dose:
 *           type: string
 *           example: "10ml"
 *         administeredAt:
 *           type: string
 *           format: date-time
 *           example: "2026-03-04T10:30:00.000Z"
 *         nextDueAt:
 *           type: string
 *           format: date-time
 *           example: "2026-09-04T10:30:00.000Z"
 *         notes:
 *           type: string
 *           example: "Administered by visiting vet"
 *
 *     CreateVaccinationResponse:
 *       type: object
 *       properties:
 *         vaccination:
 *           $ref: '#/components/schemas/Vaccination'
 *
 *     ListVaccinationsResponse:
 *       type: object
 *       properties:
 *         vaccinations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Vaccination'
 *
 *     OverdueVaccinationItem:
 *       type: object
 *       properties:
 *         publicId:
 *           type: string
 *           format: uuid
 *           description: Vaccination public_id
 *         animalPublicId:
 *           type: string
 *           format: uuid
 *           description: Animal public_id
 *         animalTagNumber:
 *           type: string
 *           nullable: true
 *         animalStatus:
 *           type: string
 *           enum: [active, sold, deceased]
 *         vaccineName:
 *           type: string
 *         nextDueAt:
 *           type: string
 *           format: date-time
 *
 *     ListOverdueVaccinationsResponse:
 *       type: object
 *       properties:
 *         overdue:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OverdueVaccinationItem'
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{publicId}/vaccinations:
 *   post:
 *     summary: Create a vaccination record for an animal
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug (public identifier)
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Animal public_id (QR identity)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVaccinationRequest'
 *     responses:
 *       201:
 *         description: Vaccination created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateVaccinationResponse'
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Animal not found
 */

// Create Animal Vaccination.
router.post(
    "/:slug/animals/:publicId/vaccinations",
    requireAuth(),
    requireRanchAccess("slug"),
    createAnimalVaccination
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{publicId}/vaccinations:
 *   get:
 *     summary: List vaccination records for an animal
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug (public identifier)
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Animal public_id (QR identity)
 *     responses:
 *       200:
 *         description: Vaccinations list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListVaccinationsResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Animal not found
 */

// List Animal Vaccinations
router.get(
    "/:slug/animals/:publicId/vaccinations",
    requireAuth(),
    requireRanchAccess("slug"),
    listAnimalVaccinations
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/vaccinations/overdue:
 *   get:
 *     summary: List overdue vaccinations for a ranch
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug (public identifier)
 *     responses:
 *       200:
 *         description: Overdue vaccinations list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListOverdueVaccinationsResponse'
 *       401:
 *         description: Unauthorized
 */

// List Over due Vaccinations
router.get(
    "/:slug/vaccinations/overdue",
    requireAuth(),
    requireRanchAccess("slug"),
    listOverdueVaccinations
);

export default router;