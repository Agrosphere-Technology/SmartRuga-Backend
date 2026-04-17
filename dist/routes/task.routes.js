"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const upload_1 = require("../middlewares/upload");
const task_controller_1 = require("../controllers/task.controller");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks:
 *   post:
 *     summary: Create a task
 *     description: Allows a ranch owner or manager to create and assign a task to a ranch member. Supports one-step image upload using multipart/form-data.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - assignedToUserPublicId
 *             properties:
 *               title:
 *                 type: string
 *                 example: Vaccinate cattle
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Vaccinate all cattle in barn A
 *               assignedToUserPublicId:
 *                 type: string
 *                 format: uuid
 *                 example: 9e1e6336-8b9e-4037-8e16-96dccbd4a51b
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: 2026-03-30T00:00:00.000Z
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation failed or assignee is not a member of the ranch
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Assignee not found
 */
router.post("/:slug/tasks", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), upload_1.upload.single("image"), task_controller_1.createTask);
/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks:
 *   get:
 *     summary: List ranch tasks
 *     description: Returns tasks for a ranch. Owners and managers see all tasks. Other ranch members only see tasks assigned to them.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug
 *     responses:
 *       200:
 *         description: Tasks returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/:slug/tasks", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), task_controller_1.listTasks);
/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks/{taskPublicId}/status:
 *   patch:
 *     summary: Update task status
 *     description: Allows the assigned user, ranch owner, or ranch manager to update a task status.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug
 *       - in: path
 *         name: taskPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task public ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *                 example: in_progress
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *       400:
 *         description: Validation failed or invalid status transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.patch("/:slug/tasks/:taskPublicId/status", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), task_controller_1.updateTaskStatus);
/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks/{taskPublicId}/cancel:
 *   patch:
 *     summary: Cancel a task
 *     description: Allows a ranch owner or manager to cancel a task that was created by mistake or is no longer needed.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug
 *       - in: path
 *         name: taskPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task public ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 nullable: true
 *                 example: Created by mistake
 *     responses:
 *       200:
 *         description: Task cancelled successfully
 *       400:
 *         description: Validation failed, task already cancelled, or task already completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.patch("/:slug/tasks/:taskPublicId/cancel", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), task_controller_1.cancelTask);
/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks/{taskPublicId}:
 *   get:
 *     summary: Get a task by public ID
 *     description: Returns detailed information for a single task.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.get("/:slug/tasks/:taskPublicId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), task_controller_1.getTaskByPublicId);
/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks/{taskPublicId}/image:
 *   post:
 *     summary: Upload or replace task image
 *     description: Allows a ranch owner or manager to upload or replace a task image.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Task image uploaded successfully
 *       400:
 *         description: Image file is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.post("/:slug/tasks/:taskPublicId/image", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), upload_1.upload.single("image"), task_controller_1.uploadTaskImage);
/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks/{taskPublicId}/image:
 *   delete:
 *     summary: Remove task image
 *     description: Allows a ranch owner or manager to remove a task image.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task image removed successfully
 *       400:
 *         description: Task has no image
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.delete("/:slug/tasks/:taskPublicId/image", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), task_controller_1.removeTaskImage);
exports.default = router;
