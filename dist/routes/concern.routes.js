"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const upload_1 = require("../middlewares/upload");
const concern_controller_1 = require("../controllers/concern.controller");
const router = (0, express_1.Router)();
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
router.post("/:slug/concerns", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), upload_1.upload.single("image"), concern_controller_1.createConcern);
router.get("/:slug/concerns", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), concern_controller_1.listConcerns);
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
router.get("/:slug/concerns/:concernPublicId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), concern_controller_1.getConcernByPublicId);
router.patch("/:slug/concerns/:concernPublicId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), concern_controller_1.updateConcern);
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
router.post("/:slug/concerns/:concernPublicId/image", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), upload_1.upload.single("image"), concern_controller_1.uploadConcernImage);
router.delete("/:slug/concerns/:concernPublicId/image", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), concern_controller_1.removeConcernImage);
exports.default = router;
