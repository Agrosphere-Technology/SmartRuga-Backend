import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getMyProfile, updateMe } from "../controllers/user.controller";

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
 *             platformRole:
 *               type: string
 *               enum: [user, admin, super_admin]
 *             firstName:
 *               type: string
 *               nullable: true
 *             lastName:
 *               type: string
 *               nullable: true
 *             phone:
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
 *         firstName:
 *           type: string
 *         lastName:
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeResponse'
 *       401:
 *         description: Unauthorized
 */


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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeResponse'
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 */

router.get("/me", requireAuth(), getMyProfile);

router.patch("/me", requireAuth(), updateMe);

export default router;