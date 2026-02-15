"use strict";
// Documentation for Admin Routes
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
// Only platform admins can do role management
router.patch("/users/:id/platform-role", (0, auth_1.requireAuth)(["admin", "super_admin"]), admin_controller_1.updateUserPlatformRole);
exports.default = router;
