/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Platform administration endpoints
 *
 * /api/v1/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get super admin platform dashboard
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
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
 * /api/v1/admin/platform-tickets:
 *   get:
 *     tags: [Admin]
 *     summary: List all platform tickets
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_review, resolved, closed]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [support, billing, technical_issue, account_access, feature_request, data_issue, other]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *
 * /api/v1/admin/platform-tickets/{publicId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get one platform ticket
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *
 *   patch:
 *     tags: [Admin]
 *     summary: Update one platform ticket
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_review, resolved, closed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               assignedToUserId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */

import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  deactivateUser,
  deleteUser,
  getPlatformDashboard,
  getPlatformTicketByPublicIdForAdmin,
  getUserByIdForAdmin,
  listAllPlatformTickets,
  listAllUsers,
  updateUserPlatformRole,
} from "../controllers/admin.controller";
import { updatePlatformTicket } from "../controllers/platform-ticket.controller";

const router = Router();

router.get(
  "/dashboard",
  requireAuth(["super_admin"]),
  getPlatformDashboard
);

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

router.get(
  "/platform-tickets",
  requireAuth(["super_admin"]),
  listAllPlatformTickets
);

router.get(
  "/platform-tickets/:publicId",
  requireAuth(["super_admin"]),
  getPlatformTicketByPublicIdForAdmin
);

router.patch(
  "/platform-tickets/:publicId",
  requireAuth(["super_admin"]),
  updatePlatformTicket
);

export default router;