// Documentation for Admin Routes

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Platform administration endpoints
 *
 * /api/v1/admin/users/{id}/platform-role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a user's platform role (admin/super_admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdatePlatformRoleRequest' }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 */

// Import necessary modules and middlewares

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { updateUserPlatformRole } from "../controllers/admin.controller";

const router = Router();

// Only platform admins can do role management
router.patch(
  "/users/:id/platform-role",
  requireAuth(["admin", "super_admin"]),
  updateUserPlatformRole
);

export default router;
