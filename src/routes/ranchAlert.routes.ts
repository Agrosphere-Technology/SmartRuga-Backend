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
 *         description: Filter read/unread
 *         schema: { type: boolean }
 *       - in: query
 *         name: alertType
 *         schema: { type: string }
 *         description: e.g health_sick, health_quarantined, status_sold, status_deceased
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