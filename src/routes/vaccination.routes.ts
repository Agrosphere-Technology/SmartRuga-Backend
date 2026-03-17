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
 *     description: Animal vaccination records and vaccination alerts
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
 *     VaccinationAlertItem:
 *       type: object
 *       properties:
 *         publicId:
 *           type: string
 *           format: uuid
 *           description: Vaccination public_id
 *         animalPublicId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Animal public_id
 *         animalTagNumber:
 *           type: string
 *           nullable: true
 *         animalStatus:
 *           type: string
 *           nullable: true
 *           enum: [active, sold, deceased]
 *         animalBreed:
 *           type: string
 *           nullable: true
 *         animalSex:
 *           type: string
 *           nullable: true
 *         vaccineName:
 *           type: string
 *         dose:
 *           type: string
 *           nullable: true
 *         administeredAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         nextDueAt:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 *           nullable: true
 *         alertStatus:
 *           type: string
 *           enum: [overdue, due_today, due_soon]
 *         daysOverdue:
 *           type: integer
 *           nullable: true
 *         daysUntilDue:
 *           type: integer
 *           nullable: true
 *
 *     VaccinationAlertsSummary:
 *       type: object
 *       properties:
 *         overdueCount:
 *           type: integer
 *         dueTodayCount:
 *           type: integer
 *         dueSoonCount:
 *           type: integer
 *         totalAlerts:
 *           type: integer
 *         dueSoonWindowDays:
 *           type: integer
 *
 *     ListVaccinationAlertsResponse:
 *       type: object
 *       properties:
 *         summary:
 *           $ref: '#/components/schemas/VaccinationAlertsSummary'
 *         overdue:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/VaccinationAlertItem'
 *         dueToday:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/VaccinationAlertItem'
 *         dueSoon:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/VaccinationAlertItem'
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
 *     summary: List ranch vaccination alerts including overdue, due today, and due soon vaccinations
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
 *       - in: query
 *         name: dueSoonDays
 *         required: false
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days ahead to consider vaccinations as due soon
 *     responses:
 *       200:
 *         description: Vaccination alerts returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListVaccinationAlertsResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/:slug/vaccinations/alerts",
    requireAuth(),
    requireRanchAccess("slug"),
    listOverdueVaccinations
);

export default router;