import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import { upload } from "../middlewares/upload";
import {
    createConcern,
    getConcernByPublicId,
    listConcerns,
    removeConcernImage,
    updateConcern,
    uploadConcernImage,
} from "../controllers/concern.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Concerns
 *     description: Ranch concern reporting, tracking, and resolution
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/concerns:
 *   post:
 *     summary: Raise a concern
 *     description: Allows any active ranch member to raise a concern, with optional image upload.
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: sunrise-pastures
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 example: Water supply issue in north pen
 *               description:
 *                 type: string
 *                 example: The water trough in the north pen is not filling properly.
 *               category:
 *                 type: string
 *                 enum: [health, inventory, animal, facility, security, task, other]
 *                 example: facility
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 example: high
 *               assignedToUserId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               entityType:
 *                 type: string
 *                 nullable: true
 *                 example: animal
 *               entityPublicId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Concern raised successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 *   get:
 *     summary: List concerns
 *     description: Returns concerns for a ranch. Managers and owners can view broader concern data depending on controller logic.
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: sunrise-pastures
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [open, in_review, resolved, dismissed]
 *       - in: query
 *         name: priority
 *         required: false
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           enum: [health, inventory, animal, facility, security, task, other]
 *       - in: query
 *         name: assignedToMe
 *         required: false
 *         schema:
 *           type: boolean
 *           example: true
 *       - in: query
 *         name: raisedByMe
 *         required: false
 *         schema:
 *           type: boolean
 *           example: true
 *     responses:
 *       200:
 *         description: Concerns fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
    "/:slug/concerns",
    requireAuth(),
    requireRanchAccess("slug"),
    upload.single("image"),
    createConcern
);

router.get(
    "/:slug/concerns",
    requireAuth(),
    requireRanchAccess("slug"),
    listConcerns
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/concerns/{concernPublicId}:
 *   get:
 *     summary: Get a concern by public ID
 *     description: Returns full details for a single concern.
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: sunrise-pastures
 *       - in: path
 *         name: concernPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 7a8b9c10-1234-4def-aaaa-1234567890ab
 *     responses:
 *       200:
 *         description: Concern fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Concern not found
 *
 *   patch:
 *     summary: Update a concern
 *     description: Allows permitted ranch users to update concern status, priority, assignment, or resolution details.
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: sunrise-pastures
 *       - in: path
 *         name: concernPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_review, resolved, dismissed]
 *                 example: in_review
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 example: urgent
 *               assignedToUserId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               resolutionNotes:
 *                 type: string
 *                 nullable: true
 *                 example: Issue has been reviewed and assigned for resolution.
 *     responses:
 *       200:
 *         description: Concern updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Concern not found
 */
router.get(
    "/:slug/concerns/:concernPublicId",
    requireAuth(),
    requireRanchAccess("slug"),
    getConcernByPublicId
);

router.patch(
    "/:slug/concerns/:concernPublicId",
    requireAuth(),
    requireRanchAccess("slug"),
    updateConcern
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/concerns/{concernPublicId}/image:
 *   post:
 *     summary: Upload or replace concern image
 *     description: Uploads or replaces the image attached to a concern.
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: sunrise-pastures
 *       - in: path
 *         name: concernPublicId
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
 *         description: Concern image uploaded successfully
 *       400:
 *         description: Image file is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Concern not found
 *
 *   delete:
 *     summary: Remove concern image
 *     description: Removes the current image attached to a concern.
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: sunrise-pastures
 *       - in: path
 *         name: concernPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Concern image removed successfully
 *       400:
 *         description: Concern has no image
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Concern not found
 */
router.post(
    "/:slug/concerns/:concernPublicId/image",
    requireAuth(),
    requireRanchAccess("slug"),
    upload.single("image"),
    uploadConcernImage
);

router.delete(
    "/:slug/concerns/:concernPublicId/image",
    requireAuth(),
    requireRanchAccess("slug"),
    removeConcernImage
);

export default router;