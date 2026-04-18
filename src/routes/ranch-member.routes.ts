import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    removeRanchMember,
    updateRanchMemberRole,
    listRanchMembers,
} from "../controllers/ranch-member.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Ranch Members
 *     description: Manage ranch members, roles, and access
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/members:
 *   get:
 *     tags: [Ranch Members]
 *     summary: List all members in a ranch
 *     description: Returns all users in a ranch with their ranch roles and basic user details
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Ranch slug
 *     responses:
 *       200:
 *         description: Ranch members fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    "/:slug/members",
    requireAuth(),
    requireRanchAccess("slug"),
    listRanchMembers
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/members/{memberId}/role:
 *   patch:
 *     tags: [Ranch Members]
 *     summary: Update ranch member role
 *     description: Allows owner or manager to change a member's ranch role (except owner)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
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
 *               - ranchRole
 *             properties:
 *               ranchRole:
 *                 type: string
 *                 enum: [owner, manager, worker, vet, storekeeper]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Member not found
 */
router.patch(
    "/:slug/members/:memberId/role",
    requireAuth(),
    requireRanchAccess("slug"),
    updateRanchMemberRole
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/members/{memberId}:
 *   delete:
 *     tags: [Ranch Members]
 *     summary: Remove a member from ranch or leave ranch
 *     description: Allows owner/manager to remove a member. Also allows a user to leave the ranch (self-removal except owner)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed or left successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Member not found
 */
router.delete(
    "/:slug/members/:memberId",
    requireAuth(),
    requireRanchAccess("slug"),
    removeRanchMember
);

export default router;