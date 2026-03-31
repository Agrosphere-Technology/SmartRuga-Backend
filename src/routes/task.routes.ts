import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import { cancelTask, createTask, getTaskByPublicId, listTasks, updateTaskStatus } from "../controllers/task.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks:
 *   post:
 *     summary: Create a task
 *     description: Allows a ranch owner or manager to create and assign a task to a ranch member.
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
 *         application/json:
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
router.post(
    "/:slug/tasks",
    requireAuth(),
    requireRanchAccess("slug"),
    createTask
);

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
router.get(
    "/:slug/tasks",
    requireAuth(),
    requireRanchAccess("slug"),
    listTasks
);

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
router.patch(
    "/:slug/tasks/:taskPublicId/status",
    requireAuth(),
    requireRanchAccess("slug"),
    updateTaskStatus
);


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


router.patch(
    "/:slug/tasks/:taskPublicId/cancel",
    requireAuth(),
    requireRanchAccess("slug"),
    cancelTask
);

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

router.get(
    "/:slug/tasks/:taskPublicId",
    requireAuth(),
    requireRanchAccess("slug"),
    getTaskByPublicId
);

export default router;