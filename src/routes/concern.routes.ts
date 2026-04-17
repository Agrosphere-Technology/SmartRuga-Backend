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
 * /api/v1/ranches/{slug}/concerns:
 *   post:
 *     summary: Raise a concern
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *   get:
 *     summary: List concerns
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *   patch:
 *     summary: Update a concern
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Remove concern image
 *     tags: [Concerns]
 *     security:
 *       - bearerAuth: []
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