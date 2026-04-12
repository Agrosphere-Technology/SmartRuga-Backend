import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    getUnreadRanchAlertsCount,
    listRanchAlerts,
    markAlertRead,
    markAlertsReadBulk,
    markAllRanchAlertsAsRead,
} from "../controllers/ranchAlert.controller";

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /api/v1/ranches/{slug}/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: List ranch alerts (paginated) + unread badge count
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: unread
 *         description: Filter unread/read
 *         schema: { type: boolean }
 *       - in: query
 *         name: alertType
 *         schema: { type: string }
 *         description: e.g health_sick,status_sold,low_stock
 *       - in: query
 *         name: animalId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         description: ISO datetime (inclusive)
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         description: ISO datetime (inclusive)
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
    "/:slug/alerts",
    requireAuth(),
    requireRanchAccess("slug"),
    listRanchAlerts
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/alerts/unread-count:
 *   get:
 *     tags: [Alerts]
 *     summary: Get unread alerts count
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get(
    "/:slug/alerts/unread-count",
    requireAuth(),
    requireRanchAccess("slug"),
    getUnreadRanchAlertsCount
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/alerts/{alertId}/read:
 *   patch:
 *     tags: [Alerts]
 *     summary: Mark a single alert as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Alert not found }
 */
router.patch(
    "/:slug/alerts/:alertId/read",
    requireAuth(),
    requireRanchAccess("slug"),
    markAlertRead
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/alerts/read:
 *   patch:
 *     tags: [Alerts]
 *     summary: Bulk mark selected alerts as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [alertIds]
 *             properties:
 *               alertIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid payload }
 */
router.patch(
    "/:slug/alerts/read",
    requireAuth(),
    requireRanchAccess("slug"),
    markAlertsReadBulk
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/alerts/read-all:
 *   patch:
 *     tags: [Alerts]
 *     summary: Mark all unread alerts as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.patch(
    "/:slug/alerts/read-all",
    requireAuth(),
    requireRanchAccess("slug"),
    markAllRanchAlertsAsRead
);

export default router;