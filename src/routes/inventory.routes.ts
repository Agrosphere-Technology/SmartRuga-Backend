import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    createInventoryItem,
    deactivateInventoryItem,
    getInventoryItemByPublicId,
    getInventorySummary,
    listInventoryItems,
    listLowStockInventoryItems,
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
 *     description: Returns inventory items for a ranch with filtering and pagination. Active items are returned by default.
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
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           example: vaccine
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: anthrax
 *       - in: query
 *         name: isActive
 *         required: false
 *         schema:
 *           type: boolean
 *           example: true
 *       - in: query
 *         name: lowStockOnly
 *         required: false
 *         schema:
 *           type: boolean
 *           example: false
 *     responses:
 *       200:
 *         description: Inventory items returned successfully
 *         content:
 *           application/json:
 *             example:
 *               items:
 *                 - publicId: 955a55bd-3732-4b85-8ca9-fc399bae9b90
 *                   name: Anthrax Vaccine
 *                   category: vaccine
 *                   unit: dose
 *                   sku: VAC-001
 *                   description: Used for anthrax prevention
 *                   quantityOnHand: 120
 *                   reorderLevel: 30
 *                   isLowStock: false
 *                   isActive: true
 *               pagination:
 *                 page: 1
 *                 limit: 10
 *                 totalItems: 1
 *                 totalPages: 1
 *                 hasNextPage: false
 *                 hasPreviousPage: false
 *               filters:
 *                 category: vaccine
 *                 search: null
 *                 isActive: true
 *                 lowStockOnly: false
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
 * /api/v1/ranches/{slug}/inventory-items/summary:
 *   get:
 *     summary: Get inventory summary
 *     description: Returns summary statistics for inventory items in a ranch.
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
 *     responses:
 *       200:
 *         description: Inventory summary returned successfully
 *         content:
 *           application/json:
 *             example:
 *               summary:
 *                 totalItems: 12
 *                 activeItems: 10
 *                 inactiveItems: 2
 *                 lowStockItems: 3
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/:slug/inventory-items/summary",
    requireAuth(),
    requireRanchAccess("slug"),
    getInventorySummary
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items/low-stock:
 *   get:
 *     summary: List low stock inventory items
 *     description: Returns all active inventory items whose quantity on hand is less than or equal to their reorder level.
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
 *     responses:
 *       200:
 *         description: Low stock inventory items returned successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/:slug/inventory-items/low-stock",
    requireAuth(),
    requireRanchAccess("slug"),
    listLowStockInventoryItems
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