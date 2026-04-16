// Documentation for Animal routes

/**
 * @openapi
 * tags:
 *   - name: Livestock
 *     description: Animals and species management within a ranch
 *   - name: QR
 *     description: QR code utilities for animal scanning
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     AnimalLookupItem:
 *       type: object
 *       properties:
 *         publicId:
 *           type: string
 *           format: uuid
 *         tagNumber:
 *           type: string
 *           nullable: true
 *         rfidTag:
 *           type: string
 *           nullable: true
 *         sex:
 *           type: string
 *           enum: [male, female, unknown]
 *         dateOfBirth:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [active, sold, deceased]
 *         species:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             code:
 *               type: string
 *               nullable: true
 *
 *     AnimalLookupResponse:
 *       type: object
 *       properties:
 *         animal:
 *           $ref: '#/components/schemas/AnimalLookupItem'
 *
 *     BulkAnimalLookupRequest:
 *       type: object
 *       required:
 *         - identifiers
 *       properties:
 *         identifiers:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - "982000123456789"
 *             - "WR-COW-0001"
 *             - "0ec2f8a8-9f08-4cba-a7a6-1df4ce7dcefa"
 *
 *     BulkAnimalLookupResultItem:
 *       type: object
 *       properties:
 *         identifier:
 *           type: string
 *         animal:
 *           $ref: '#/components/schemas/AnimalLookupItem'
 *
 *     BulkAnimalLookupResponse:
 *       type: object
 *       properties:
 *         found:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BulkAnimalLookupResultItem'
 *         notFound:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals:
 *   post:
 *     tags:
 *       - Livestock
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
 *     tags:
 *       - Livestock
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
 *               $ref: '#/components/schemas/AnimalListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/lookup:
 *   get:
 *     tags:
 *       - Livestock
 *     summary: Look up a single animal by public ID, RFID tag, or tag number
 *     description: Useful for QR, RFID, or manual tag searches.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *       - in: query
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         example: "982000123456789"
 *     responses:
 *       200:
 *         description: Animal found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnimalLookupResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Animal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/lookup/bulk:
 *   post:
 *     tags:
 *       - Livestock
 *     summary: Bulk look up animals by public IDs, RFID tags, or tag numbers
 *     description: Useful for scanner sessions or bulk matching.
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
 *             $ref: '#/components/schemas/BulkAnimalLookupRequest'
 *     responses:
 *       200:
 *         description: Bulk lookup result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkAnimalLookupResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{id}:
 *   get:
 *     tags:
 *       - Livestock
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
 *               $ref: '#/components/schemas/AnimalLookupItem'
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
 * /api/v1/ranches/{slug}/animals/{id}:
 *   patch:
 *     tags:
 *       - Livestock
 *     summary: Update an animal (partial update)
 *     description: |
 *       Updates one or more animal fields.
 *
 *       Permissions:
 *       - Owner: can update all fields including status
 *       - Manager: can update all fields including status
 *       - Vet: can update animal details but cannot change status
 *       - Worker / Storekeeper: cannot update animals
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAnimalRequest'
 *     responses:
 *       200:
 *         description: Animal updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateAnimalResponse'
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
 *       404:
 *         description: Animal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Tag number or RFID tag already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{id}/qr:
 *   get:
 *     tags:
 *       - QR
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

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{id}/image:
 *   post:
 *     tags:
 *       - Livestock
 *     summary: Upload or replace animal image
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Animal image uploaded successfully
 *       400:
 *         description: Image file is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Animal not found
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/animals/{id}/image:
 *   delete:
 *     tags:
 *       - Livestock
 *     summary: Remove animal image
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
 *         description: Animal image removed successfully
 *       400:
 *         description: Animal does not have an image
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Animal not found
 */

// Import necessary modules and middlewares

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
  createAnimal,
  getAnimalById,
  listAnimals,
  updateAnimal,
  lookupAnimal,
  bulkLookupAnimals,
  uploadAnimalImage,
  removeAnimalImage,
} from "../controllers/animal.controller";
import { getAnimalQrPng } from "../controllers/animalQr.controller";
import { upload } from "../middlewares/upload";

const router = Router({ mergeParams: true });

router.post(
  "/:slug/animals",
  requireAuth(),
  requireRanchAccess("slug"),
  createAnimal
);

router.get(
  "/:slug/animals",
  requireAuth(),
  requireRanchAccess("slug"),
  listAnimals
);

router.get(
  "/:slug/animals/lookup",
  requireAuth(),
  requireRanchAccess("slug"),
  lookupAnimal
);

router.post(
  "/:slug/animals/lookup/bulk",
  requireAuth(),
  requireRanchAccess("slug"),
  bulkLookupAnimals
);

router.get(
  "/:slug/animals/:id",
  requireAuth(),
  requireRanchAccess("slug"),
  getAnimalById
);

router.patch(
  "/:slug/animals/:id",
  requireAuth(),
  requireRanchAccess("slug"),
  updateAnimal
);

router.get(
  "/:slug/animals/:id/qr",
  requireAuth(),
  requireRanchAccess("slug"),
  getAnimalQrPng
);

router.post(
  "/:slug/animals/:id/image",
  requireAuth(),
  requireRanchAccess("slug"),
  upload.single("image"),
  uploadAnimalImage
);

router.delete(
  "/:slug/animals/:id/image",
  requireAuth(),
  requireRanchAccess("slug"),
  removeAnimalImage
);
export default router;