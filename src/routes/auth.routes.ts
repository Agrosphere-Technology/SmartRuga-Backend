// Documentation for Auth routes

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication and session endpoints
 *
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     security: []
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } } }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Email already in use, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     security: []
 *     summary: Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } } }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Invalid credentials, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/AuthUser' } } } }
 *       401: { description: Unauthorized }
 *
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     security: []
 *     summary: Refresh access token (cookie first, body fallback)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: "string" }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *       401: { description: Missing/invalid refresh token }
 *
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     security: []
 *     summary: Logout (revokes refresh token if present)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 */

// Import necessary modules and middlewares
import { Router } from "express";
import {
  login,
  logout,
  refresh,
  register,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// handy endpoint for frontend/mobile
router.get("/me", requireAuth(), (req, res) => {
  res.json({ user: req.user });
});

export default router;
