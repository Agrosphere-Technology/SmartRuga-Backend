"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const inventory_controller_1 = require("../controllers/inventory.controller");
const upload_1 = require("../middlewares/upload");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items:
 *   post:
 *     summary: Create an inventory item
 *     description: Allows a ranch owner, manager, or storekeeper to create a new inventory item, with optional image upload.
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
 *         multipart/form-data:
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
 *               image:
 *                 type: string
 *                 format: binary
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
 */
router.post("/:slug/inventory-items", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), upload_1.upload.single("image"), inventory_controller_1.createInventoryItem);
router.get("/:slug/inventory-items", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.listInventoryItems);
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
 *       401:
 *         description: Unauthorized
 */
router.get("/:slug/inventory-items/summary", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.getInventorySummary);
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
router.get("/:slug/inventory-items/low-stock", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.listLowStockInventoryItems);
/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items/dashboard:
 *   get:
 *     summary: Get inventory dashboard analytics
 *     description: Returns inventory analytics including totals, low stock count, total quantity on hand, and category breakdown.
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
 *         description: Inventory dashboard analytics returned successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/:slug/inventory-items/dashboard", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.getInventoryDashboard);
/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items/recent-movements:
 *   get:
 *     summary: List recent inventory movements
 *     description: Returns recent stock movement activity across the ranch inventory.
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
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Recent inventory movements returned successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/:slug/inventory-items/recent-movements", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.listRecentInventoryMovements);
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
router.get("/:slug/inventory-items/:itemPublicId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.getInventoryItemByPublicId);
router.patch("/:slug/inventory-items/:itemPublicId", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), upload_1.upload.single("image"), inventory_controller_1.updateInventoryItem);
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
router.patch("/:slug/inventory-items/:itemPublicId/deactivate", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.deactivateInventoryItem);
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
router.post("/:slug/inventory-items/:itemPublicId/movements", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.recordStockMovement);
router.get("/:slug/inventory-items/:itemPublicId/movements", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.listStockMovements);
/**
 * @openapi
 * /api/v1/ranches/{slug}/inventory-items/{itemPublicId}/image:
 *   post:
 *     summary: Upload or replace inventory item image
 *     description: Uploads or replaces an image for a single inventory item.
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
 *         description: Inventory image uploaded successfully
 *       400:
 *         description: Image file is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inventory item not found
 *
 *   delete:
 *     summary: Remove inventory item image
 *     description: Removes the current image from a single inventory item.
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
 *         description: Inventory image removed successfully
 *       400:
 *         description: Item has no image
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inventory item not found
 */
router.post("/:slug/inventory-items/:itemPublicId/image", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), upload_1.upload.single("image"), inventory_controller_1.uploadInventoryItemImage);
router.delete("/:slug/inventory-items/:itemPublicId/image", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), inventory_controller_1.removeInventoryItemImage);
exports.default = router;
