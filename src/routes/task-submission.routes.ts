import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    createTaskSubmission,
    getTaskSubmissionByPublicId,
    listTaskSubmissions,
    reviewTaskSubmission,
} from "../controllers/task-submission.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks/{taskPublicId}/submissions:
 *   post:
 *     summary: Submit proof for a task
 *     description: Allows the assigned ranch member to submit proof for a task.
 *     tags: [Task Submissions]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proofType
 *             properties:
 *               proofType:
 *                 type: string
 *                 enum: [image, scan]
 *                 example: image
 *               proofUrl:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/proof.jpg
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 example: Vaccination completed successfully
 *     responses:
 *       201:
 *         description: Task submission created successfully
 *       400:
 *         description: Validation failed or pending submission already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *
 *   get:
 *     summary: List task submissions
 *     description: Returns submissions for a task. Owners and managers can view all. Assignees can view submissions for their own task.
 *     tags: [Task Submissions]
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
 *         description: Task submissions returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *
 * /api/v1/ranches/{slug}/tasks/{taskPublicId}/submissions/{submissionPublicId}/review:
 *   patch:
 *     summary: Review a task submission
 *     description: Allows a ranch owner or manager to approve or reject a task submission.
 *     tags: [Task Submissions]
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
 *       - in: path
 *         name: submissionPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *                 enum: [approved, rejected]
 *                 example: approved
 *               reviewNotes:
 *                 type: string
 *                 nullable: true
 *                 example: Looks good
 *     responses:
 *       200:
 *         description: Task submission reviewed successfully
 *       400:
 *         description: Validation failed or submission is not pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task or submission not found
 */

router.post(
    "/:slug/tasks/:taskPublicId/submissions",
    requireAuth(),
    requireRanchAccess("slug"),
    createTaskSubmission
);

router.get(
    "/:slug/tasks/:taskPublicId/submissions",
    requireAuth(),
    requireRanchAccess("slug"),
    listTaskSubmissions
);

router.patch(
    "/:slug/tasks/:taskPublicId/submissions/:submissionPublicId/review",
    requireAuth(),
    requireRanchAccess("slug"),
    reviewTaskSubmission
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/tasks/{taskPublicId}/submissions/{submissionPublicId}:
 *   get:
 *     summary: Get a task submission by public ID
 *     description: Returns detailed information for a single task submission.
 *     tags: [Task Submissions]
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
 *       - in: path
 *         name: submissionPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task submission returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task or submission not found
 */

router.get(
    "/:slug/tasks/:taskPublicId/submissions/:submissionPublicId",
    requireAuth(),
    requireRanchAccess("slug"),
    getTaskSubmissionByPublicId
);

export default router;