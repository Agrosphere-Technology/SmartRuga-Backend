"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/ranches/{slug}/dashboard:
 *   get:
 *     summary: Get ranch dashboard overview
 *     description: |
 *       Returns a dashboard summary for the ranch.
 *
 *       Ranch-wide sections:
 *       - animal statistics
 *       - vaccination alerts
 *       - animal activity feed
 *
 *       Role-aware sections:
 *       - owners and managers see ranch-wide task and submission approval insights
 *       - other ranch members see only task and submission insights relevant to them
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug
 *       - in: query
 *         name: dueSoonDays
 *         required: false
 *         schema:
 *           type: integer
 *           example: 7
 *         description: Number of days ahead to consider vaccinations as due soon
 *     responses:
 *       200:
 *         description: Ranch dashboard returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: string
 *                   nullable: true
 *                   example: owner
 *                 animals:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 4
 *                     active:
 *                       type: integer
 *                       example: 4
 *                     sold:
 *                       type: integer
 *                       example: 0
 *                     deceased:
 *                       type: integer
 *                       example: 0
 *                     sick:
 *                       type: integer
 *                       example: 0
 *                 vaccinationAlerts:
 *                   type: object
 *                   properties:
 *                     overdue:
 *                       type: integer
 *                       example: 0
 *                     dueToday:
 *                       type: integer
 *                       example: 0
 *                     dueSoon:
 *                       type: integer
 *                       example: 0
 *                     dueSoonWindowDays:
 *                       type: integer
 *                       example: 7
 *                 tasks:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     pending:
 *                       type: integer
 *                       example: 0
 *                     inProgress:
 *                       type: integer
 *                       example: 1
 *                     completed:
 *                       type: integer
 *                       example: 1
 *                     cancelled:
 *                       type: integer
 *                       example: 1
 *                 submissionApprovals:
 *                   type: object
 *                   properties:
 *                     pending:
 *                       type: integer
 *                       example: 0
 *                     approved:
 *                       type: integer
 *                       example: 1
 *                     rejected:
 *                       type: integer
 *                       example: 1
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum:
 *                           - health
 *                           - animal_update
 *                           - movement
 *                           - vaccination
 *                           - task_created
 *                           - task_submission
 *                           - task_review
 *                         example: task_review
 *                       id:
 *                         type: string
 *                         example: beefb1f0-1e00-49d1-b8fb-a228b5d2b87b
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2026-03-26T23:16:47.863Z
 *                       animalPublicId:
 *                         type: string
 *                         nullable: true
 *                         example: 0c8440e0-44d6-4f39-a2a6-a88727cead0f
 *                       animalTagNumber:
 *                         type: string
 *                         nullable: true
 *                         example: COW-004
 *                       taskPublicId:
 *                         type: string
 *                         nullable: true
 *                         example: 6887ae11-bcb9-4952-a4f2-4859a71be19c
 *                       taskTitle:
 *                         type: string
 *                         nullable: true
 *                         example: Vaccinate goat
 *                       title:
 *                         type: string
 *                         example: Task submission reviewed
 *                       description:
 *                         type: string
 *                         example: Submission for task "Vaccinate goat" was rejected
 *                       changes:
 *                         type: array
 *                         nullable: true
 *                         items:
 *                           type: object
 *                           properties:
 *                             field:
 *                               type: string
 *                               nullable: true
 *                               example: weight
 *                             from:
 *                               type: string
 *                               nullable: true
 *                               example: 80
 *                             to:
 *                               type: string
 *                               nullable: true
 *                               example: 90
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ranch not found
 */
router.get("/:slug/dashboard", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), dashboard_controller_1.getRanchDashboard);
exports.default = router;
