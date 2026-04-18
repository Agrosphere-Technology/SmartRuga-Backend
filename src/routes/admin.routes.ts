// Documentation for Admin Routes

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Platform administration endpoints
 *
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *
 * /api/v1/admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get one user with ranch memberships
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 *
 * /api/v1/admin/users/{id}/platform-role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a user's platform role
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
 *
 * /api/v1/admin/users/{id}/deactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Deactivate a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 *
 * /api/v1/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Soft delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 */

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  deactivateUser,
  deleteUser,
  getUserByIdForAdmin,
  listAllUsers,
  updateUserPlatformRole,
} from "../controllers/admin.controller";

const router = Router();

router.get(
  "/users",
  requireAuth(["super_admin"]),
  listAllUsers
);

router.get(
  "/users/:id",
  requireAuth(["super_admin"]),
  getUserByIdForAdmin
);

router.patch(
  "/users/:id/platform-role",
  requireAuth(["admin", "super_admin"]),
  updateUserPlatformRole
);

router.patch(
  "/users/:id/deactivate",
  requireAuth(["super_admin"]),
  deactivateUser
);

router.delete(
  "/users/:id",
  requireAuth(["super_admin"]),
  deleteUser
);

export default router;