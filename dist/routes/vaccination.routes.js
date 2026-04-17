"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const vaccination_controller_1 = require("../controllers/vaccination.controller");
const router = (0, express_1.Router)();
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
 *         animalPublicId:
 *           type: string
 *           format: uuid
 *           nullable: true
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
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
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
router.post("/:slug/animals/:publicId/vaccinations", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), vaccination_controller_1.createAnimalVaccination);
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
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
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
router.get("/:slug/animals/:publicId/vaccinations", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), vaccination_controller_1.listAnimalVaccinations);
/**
 * @openapi
 * /api/v1/ranches/{slug}/vaccinations/alerts:
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
router.get("/:slug/vaccinations/alerts", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), vaccination_controller_1.listVaccinationAlerts);
/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{publicId}/vaccinations/{vaccinationPublicId}:
 *   patch:
 *     summary: Update a vaccination record
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: vaccinationPublicId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVaccinationRequest'
 *     responses:
 *       200:
 *         description: Vaccination updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateVaccinationResponse'
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Animal or vaccination not found
 */
router.patch("/:slug/animals/:publicId/vaccinations/:vaccinationPublicId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), vaccination_controller_1.updateAnimalVaccination);
/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{publicId}/vaccinations/{vaccinationPublicId}:
 *   get:
 *     summary: Get a single vaccination record
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: vaccinationPublicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vaccination fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateVaccinationResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Animal or vaccination not found
 */
router.get("/:slug/animals/:publicId/vaccinations/:vaccinationPublicId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), vaccination_controller_1.getAnimalVaccination);
/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{publicId}/vaccinations/{vaccinationPublicId}:
 *   delete:
 *     summary: Archive a vaccination record
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: vaccinationPublicId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Wrong entry
 *     responses:
 *       200:
 *         description: Vaccination archived successfully
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Animal or vaccination not found
 */
router.delete("/:slug/animals/:publicId/vaccinations/:vaccinationPublicId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), vaccination_controller_1.deleteAnimalVaccination);
exports.default = router;
