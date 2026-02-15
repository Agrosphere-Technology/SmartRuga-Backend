"use strict";
// Documentation for Animal routes
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @openapi
 * tags:
 *   - name: Livestock
 *     description: Animals and species management within a ranch
 */
/**
 * @openapi
 * /api/v1/ranches/{slug}/animals:
 *   post:
 *     tags: [Livestock]
 *     summary: Create an animal in a ranch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAnimalRequest'
 *     responses:
 *       201:
 *         description: Animal created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateAnimalResponse'
 *       400:
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 *
 *   get:
 *     tags: [Livestock]
 *     summary: List animals in a ranch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *     responses:
 *       200:
 *         description: Animals list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 animals:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Animal'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{id}:
 *   get:
 *     tags: [Livestock]
 *     summary: Get an animal by internal ID (ranch scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Animal details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Animal'
 *       404:
 *         description: Animal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{id}/qr:
 *   get:
 *     tags: [QR]
 *     summary: Generate QR code PNG for an animal
 *     description: Returns a PNG image for printing animal tags. QR encodes the public scan URL (/a/{publicId}).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: PNG QR code image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Animal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
// Import necessary modules and middlewares
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const animal_controller_1 = require("../controllers/animal.controller");
const animalQr_controller_1 = require("../controllers/animalQr.controller");
const router = (0, express_1.Router)({ mergeParams: true });
router.post("/:slug/animals", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animal_controller_1.createAnimal);
router.get("/:slug/animals", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animal_controller_1.listAnimals);
router.get("/:slug/animals/:id", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animal_controller_1.getAnimalById);
// generate qr code/image
router.get("/:slug/animals/:id/qr", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), animalQr_controller_1.getAnimalQrPng);
exports.default = router;
