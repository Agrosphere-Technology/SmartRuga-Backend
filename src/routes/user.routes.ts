import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { upload } from "../middlewares/upload";
import {
    getMyProfile,
    removeMyProfileImage,
    updateMe,
    uploadMyProfileImage,
} from "../controllers/user.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User profile endpoints
 */

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     MeResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             email:
 *               type: string
 *               format: email
 *             platform_role:
 *               type: string
 *               enum: [user, admin, super_admin]
 *             first_name:
 *               type: string
 *               nullable: true
 *             last_name:
 *               type: string
 *               nullable: true
 *             phone:
 *               type: string
 *               nullable: true
 *             imageUrl:
 *               type: string
 *               nullable: true
 *             imagePublicId:
 *               type: string
 *               nullable: true
 *         profileComplete:
 *           type: boolean
 *         missingFields:
 *           type: array
 *           items:
 *             type: string
 *     UpdateMeRequest:
 *       type: object
 *       properties:
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         phone:
 *           type: string
 */

/**
 * @openapi
 * /api/v1/me:
 *   get:
 *     summary: Get my profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile payload
 *       401:
 *         description: Unauthorized
 */
router.get("/me", requireAuth(), getMyProfile);

/**
 * @openapi
 * /api/v1/me:
 *   patch:
 *     summary: Update my profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMeRequest'
 *     responses:
 *       200:
 *         description: Updated profile payload
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 */
router.patch("/me", requireAuth(), updateMe);

/**
 * @openapi
 * /api/v1/me/image:
 *   post:
 *     summary: Upload or replace my profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *         description: Profile image uploaded successfully
 *       400:
 *         description: Image file is required
 *       401:
 *         description: Unauthorized
 */
router.post(
    "/me/image",
    requireAuth(),
    upload.single("image"),
    uploadMyProfileImage
);

/**
 * @openapi
 * /api/v1/me/image:
 *   delete:
 *     summary: Remove my profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile image removed successfully
 *       400:
 *         description: Profile has no image
 *       401:
 *         description: Unauthorized
 */
router.delete("/me/image", requireAuth(), removeMyProfileImage);

export default router;