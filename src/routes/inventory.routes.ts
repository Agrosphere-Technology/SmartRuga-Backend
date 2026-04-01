import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
    createInventoryItem,
    getInventoryItemByPublicId,
    listInventoryItems,
    listStockMovements,
    recordStockMovement,
} from "../controllers/inventory.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items:
 *   post:
 *     summary: Create an inventory item
 *     description: Allows a ranch owner or manager to create a new inventory item.
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
 *         content:
 *           application/json:
 *             example:
 *               message: Inventory item created successfully
 *               item:
 *                 publicId: 7a8b9c10-1234-4def-aaaa-1234567890ab
 *                 name: Anthrax Vaccine
 *                 category: vaccine
 *                 unit: dose
 *                 quantityOnHand: 120
 *                 reorderLevel: 30
 *                 isActive: true
 *                 createdAt: 2026-04-01T10:00:00.000Z
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 *   get:
 *     summary: List inventory items
 *     description: Returns all active inventory items for a ranch.
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
 *         description: Inventory items returned successfully
 *         content:
 *           application/json:
 *             example:
 *               items:
 *                 - publicId: 7a8b9c10-1234-4def-aaaa-1234567890ab
 *                   name: Anthrax Vaccine
 *                   category: vaccine
 *                   unit: dose
 *                   sku: VAC-001
 *                   description: Used for anthrax prevention
 *                   quantityOnHand: 120
 *                   reorderLevel: 30
 *                   isLowStock: false
 *                   isActive: true
 *                   createdAt: 2026-04-01T10:00:00.000Z
 *                   updatedAt: 2026-04-01T10:00:00.000Z
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
 *         content:
 *           application/json:
 *             example:
 *               item:
 *                 publicId: 7a8b9c10-1234-4def-aaaa-1234567890ab
 *                 name: Anthrax Vaccine
 *                 category: vaccine
 *                 unit: dose
 *                 sku: VAC-001
 *                 description: Used for anthrax prevention
 *                 quantityOnHand: 120
 *                 reorderLevel: 30
 *                 isLowStock: false
 *                 isActive: true
 *                 createdAt: 2026-04-01T10:00:00.000Z
 *                 updatedAt: 2026-04-01T10:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
router.get(
    "/:slug/inventory-items/:itemPublicId",
    requireAuth(),
    requireRanchAccess("slug"),
    getInventoryItemByPublicId
);

/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items/{itemPublicId}/movements:
 *   post:
 *     summary: Record a stock movement
 *     description: Allows a ranch owner or manager to record stock in, stock out, or adjustment for an inventory item.
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
 *                 example: stock_out
 *               quantity:
 *                 type: number
 *                 example: 10
 *               reason:
 *                 type: string
 *                 nullable: true
 *                 example: Used for vaccination task
 *               referenceType:
 *                 type: string
 *                 nullable: true
 *                 example: task
 *               referencePublicId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: 3a794a02-e056-4e9e-8b43-5fa8f75c96dc
 *     responses:
 *       201:
 *         description: Stock movement recorded successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Stock movement recorded successfully
 *               movement:
 *                 publicId: 0d2b6d6f-1111-4f77-bbbb-999999999999
 *                 type: stock_out
 *                 quantity: 10
 *                 previousQuantity: 120
 *                 newQuantity: 110
 *                 reason: Used for vaccination task
 *                 createdAt: 2026-04-01T11:00:00.000Z
 *               item:
 *                 publicId: 7a8b9c10-1234-4def-aaaa-1234567890ab
 *                 quantityOnHand: 110
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
 *     summary: List stock movements for an inventory item
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
 *         description: Stock movements returned successfully
 *         content:
 *           application/json:
 *             example:
 *               item:
 *                 publicId: 7a8b9c10-1234-4def-aaaa-1234567890ab
 *                 name: Anthrax Vaccine
 *                 quantityOnHand: 110
 *               movements:
 *                 - publicId: 0d2b6d6f-1111-4f77-bbbb-999999999999
 *                   type: stock_out
 *                   quantity: 10
 *                   previousQuantity: 120
 *                   newQuantity: 110
 *                   reason: Used for vaccination task
 *                   referenceType: task
 *                   referencePublicId: 3a794a02-e056-4e9e-8b43-5fa8f75c96dc
 *                   createdAt: 2026-04-01T11:00:00.000Z
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