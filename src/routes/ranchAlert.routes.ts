/**
 * @openapi
 * /api/v1/ranches/{slug}/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: List ranch alerts (pagination + filtering)
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
 *         name: type
 *         description: Comma-separated alert types (e.g. health_sick,status_sold)
 *         schema:
 *           type: string
 *       - in: query
 *         name: unread
 *         description: true=only unread, false=only read
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Invalid query params
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

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
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Alert not found }
 */

/**
 * @openapi
 * /api/v1/ranches/{slug}/alerts/read:
 *   patch:
 *     tags: [Alerts]
 *     summary: Bulk mark alerts as read
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
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */


import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import { listRanchAlerts, markAlertRead, markAlertsReadBulk } from "../controllers/ranchAlert.controller";

const router = Router({ mergeParams: true });

router.get(
    "/:slug/alerts",
    requireAuth(),
    requireRanchAccess("slug"),
    listRanchAlerts
);


router.patch(
    "/:slug/alerts/:alertId/read",
    requireAuth(),
    requireRanchAccess("slug"),
    markAlertRead
);

router.patch(
    "/:slug/alerts/read",
    requireAuth(),
    requireRanchAccess("slug"),
    markAlertsReadBulk
);
export default router;