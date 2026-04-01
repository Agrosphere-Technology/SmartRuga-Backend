import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    createInventoryItem,
    deactivateInventoryItem,
    getInventoryItemByPublicId,
    listInventoryItems,
    listStockMovements,
    recordStockMovement,
    updateInventoryItem,
} from "../controllers/inventory.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items:
 *   post:
 *     summary: Create an inventory item
 *     description: Allows a ranch owner, manager, or storekeeper to create a new inventory item.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - unit
 *               - quantityOnHand
 *               - reorderLevel
 *             properties:
 *               name:
 *                 type: string
 *                 example: Anthrax Vaccine
 *               category:
 *                 type: string
 *                 example: vaccine
 *               unit:
 *                 type: string
 *                 example: dose
 *               sku:
 *                 type: string
 *                 nullable: true
 *                 example: VAC-001
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Used for anthrax prevention
 *               quantityOnHand:
 *                 type: number
 *                 example: 120
 *               reorderLevel:
 *                 type: number
 *                 example: 30
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 *   get:
 *     summary: List inventory items
 *     description: Returns inventory items for a ranch. Active items are returned by default.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *       - in: query
 *         name: includeInactive
 *         required: false
 *         schema:
 *           type: boolean
 *         example: false
 *     responses:
 *       200:
 *         description: Inventory items returned successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
    "/:slug/inventory-items",
    requireAuth(),
    requireRanchAccess("slug"),
    createInventoryItem
);

router.get(
    "/:slug/inventory-items",
    requireAuth(),
    requireRanchAccess("slug"),
    listInventoryItems
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items/{itemPublicId}:
 *   get:
 *     summary: Get an inventory item by public ID
 *     description: Returns detailed information for a single inventory item.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *       - in: path
 *         name: itemPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 7a8b9c10-1234-4def-aaaa-1234567890ab
 *     responses:
 *       200:
 *         description: Inventory item returned successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 *
 *   patch:
 *     summary: Update an inventory item
 *     description: Allows a ranch owner, manager, or storekeeper to update an inventory item.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemPublicId
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
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               unit:
 *                 type: string
 *               sku:
 *                 type: string
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *               reorderLevel:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Item not found
 */
router.get(
    "/:slug/inventory-items/:itemPublicId",
    requireAuth(),
    requireRanchAccess("slug"),
    getInventoryItemByPublicId
);

router.patch(
    "/:slug/inventory-items/:itemPublicId",
    requireAuth(),
    requireRanchAccess("slug"),
    updateInventoryItem
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items/{itemPublicId}/deactivate:
 *   patch:
 *     summary: Deactivate an inventory item
 *     description: Soft deletes an inventory item by setting it as inactive.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inventory item deactivated successfully
 *       400:
 *         description: Inventory item already inactive
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Item not found
 */
router.patch(
    "/:slug/inventory-items/:itemPublicId/deactivate",
    requireAuth(),
    requireRanchAccess("slug"),
    deactivateInventoryItem
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items/{itemPublicId}/movements:
 *   post:
 *     summary: Record a stock movement
 *     description: Allows a ranch owner, manager, or storekeeper to record stock movement for an inventory item.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemPublicId
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
 *               - type
 *               - quantity
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [stock_in, stock_out, adjustment]
 *               quantity:
 *                 type: number
 *               reason:
 *                 type: string
 *                 nullable: true
 *               referenceType:
 *                 type: string
 *                 nullable: true
 *               referencePublicId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Stock movement recorded successfully
 *       400:
 *         description: Validation failed or insufficient stock
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Item not found
 *
 *   get:
 *     summary: List stock movements
 *     description: Returns stock movement history for a single inventory item.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemPublicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Stock movements returned successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
router.post(
    "/:slug/inventory-items/:itemPublicId/movements",
    requireAuth(),
    requireRanchAccess("slug"),
    recordStockMovement
);

router.get(
    "/:slug/inventory-items/:itemPublicId/movements",
    requireAuth(),
    requireRanchAccess("slug"),
    listStockMovements
);

export default router;