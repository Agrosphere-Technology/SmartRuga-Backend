"use strict";
// Documentation for Ranch routes
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @openapi
 * tags:
 *   - name: Ranches
 *     description: Ranch workspaces and membership access
 *
 * /api/v1/ranches:
 *   post:
 *     tags: [Ranches]
 *     summary: Create a ranch (admin/super_admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RanchCreateRequest' }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/RanchResponse' } } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *
 *   get:
 *     tags: [Ranches]
 *     summary: List ranches current user belongs to
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ranches:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/RanchSummary' }
 *
 * /api/v1/ranches/{slug}:
 *   get:
 *     tags: [Ranches]
 *     summary: Get ranch by slug (member only)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/RanchResponse' } } } }
 *       403: { description: Access denied }
 *       404: { description: Ranch not found }
 */
// Import necessary modules and middlewares
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranch_controller_1 = require("../controllers/ranch.controller");
const roles_1 = require("../constants/roles");
const router = (0, express_1.Router)();
// create ranch
router.post("/", (0, auth_1.requireAuth)([roles_1.PLATFORM_ROLES.ADMIN, roles_1.PLATFORM_ROLES.SUPER_ADMIN]), ranch_controller_1.createRanch);
// list ranches user belongs to
router.get("/", (0, auth_1.requireAuth)(), ranch_controller_1.listAllRanches);
// get ranch by slug
router.get("/:slug", (0, auth_1.requireAuth)(), ranch_controller_1.getRanchBySlug);
exports.default = router;
