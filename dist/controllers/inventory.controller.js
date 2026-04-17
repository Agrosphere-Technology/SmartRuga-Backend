"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInventoryItem = createInventoryItem;
exports.listInventoryItems = listInventoryItems;
exports.getInventorySummary = getInventorySummary;
exports.listLowStockInventoryItems = listLowStockInventoryItems;
exports.getInventoryDashboard = getInventoryDashboard;
exports.listRecentInventoryMovements = listRecentInventoryMovements;
exports.getInventoryItemByPublicId = getInventoryItemByPublicId;
exports.updateInventoryItem = updateInventoryItem;
exports.deactivateInventoryItem = deactivateInventoryItem;
exports.recordStockMovement = recordStockMovement;
exports.listStockMovements = listStockMovements;
exports.uploadInventoryItemImage = uploadInventoryItemImage;
exports.removeInventoryItemImage = removeInventoryItemImage;
const cloudinary_1 = require("cloudinary");
const sequelize_1 = require("sequelize");
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
const inventory_validator_1 = require("../validators/inventory.validator");
const inventory_helpers_1 = require("../helpers/inventory.helpers");
const ranchAlert_service_1 = require("../services/ranchAlert.service");
const apiResponse_1 = require("../utils/apiResponse");
function pickValue(obj, keys) {
    if (!obj)
        return null;
    for (const key of keys) {
        const value = obj?.getDataValue?.(key) ??
            obj?.dataValues?.[key] ??
            obj?.[key];
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return null;
}
function formatUser(user) {
    if (!user)
        return null;
    const firstName = pickValue(user, ["first_name", "firstName"]);
    const lastName = pickValue(user, ["last_name", "lastName"]);
    const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
    return {
        publicId: pickValue(user, ["public_id", "publicId"]),
        name: pickValue(user, ["name", "full_name", "fullName"]) ?? combinedName,
        email: pickValue(user, ["email"]),
    };
}
function formatInventoryItem(item) {
    const quantityOnHand = Number(pickValue(item, ["quantity_on_hand", "quantityOnHand"]) ?? 0);
    const reorderLevel = Number(pickValue(item, ["reorder_level", "reorderLevel"]) ?? 0);
    const createdByUser = item?.get?.("createdByUser") ?? item?.createdByUser;
    const updatedByUser = item?.get?.("updatedByUser") ?? item?.updatedByUser;
    return {
        publicId: pickValue(item, ["public_id", "publicId"]),
        name: pickValue(item, ["name"]),
        category: pickValue(item, ["category"]),
        unit: pickValue(item, ["unit"]),
        sku: pickValue(item, ["sku"]),
        description: pickValue(item, ["description"]),
        imageUrl: pickValue(item, ["image_url", "imageUrl"]),
        imagePublicId: pickValue(item, ["image_public_id", "imagePublicId"]),
        quantityOnHand,
        reorderLevel,
        isLowStock: quantityOnHand <= reorderLevel,
        isActive: pickValue(item, ["is_active", "isActive"]),
        createdAt: pickValue(item, ["created_at", "createdAt"]),
        updatedAt: pickValue(item, ["updated_at", "updatedAt"]),
        createdByUser: formatUser(createdByUser),
        updatedByUser: formatUser(updatedByUser),
    };
}
function uploadBufferToCloudinary(fileBuffer, folder, publicId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: publicId,
            resource_type: "image",
            overwrite: true,
        }, (error, result) => {
            if (error || !result) {
                reject(error ?? new Error("Image upload failed"));
                return;
            }
            resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
            });
        });
        stream.end(fileBuffer);
    });
}
// Create Inventory Item
async function createInventoryItem(req, res) {
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        if (!inventory_helpers_1.ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Forbidden",
            }));
        }
        const payload = {
            ...req.body,
            quantityOnHand: req.body?.quantityOnHand !== undefined
                ? Number(req.body.quantityOnHand)
                : req.body?.quantityOnHand,
            reorderLevel: req.body?.reorderLevel !== undefined
                ? Number(req.body.reorderLevel)
                : req.body?.reorderLevel,
        };
        const parsed = inventory_validator_1.createInventoryItemSchema.safeParse(payload);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const validated = parsed.data;
        const createdItem = await models_1.InventoryItem.create({
            ranch_id: ranchId,
            name: validated.name,
            category: validated.category,
            unit: validated.unit,
            sku: validated.sku ?? null,
            description: validated.description ?? null,
            image_url: null,
            image_public_id: null,
            quantity_on_hand: validated.quantityOnHand,
            reorder_level: validated.reorderLevel,
            is_active: true,
            created_by_user_id: userId,
            updated_by_user_id: userId,
        });
        if (req.file) {
            const itemPublicIdResolved = String(createdItem.getDataValue("public_id"));
            const uploadResult = await uploadBufferToCloudinary(req.file.buffer, `smartruga/inventory/${ranchId}`, `inventory-item-${itemPublicIdResolved}`);
            await createdItem.update({
                image_url: uploadResult.secure_url,
                image_public_id: uploadResult.public_id,
                updated_by_user_id: userId,
            });
        }
        const item = await models_1.InventoryItem.findOne({
            where: {
                id: createdItem.getDataValue("id"),
            },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Inventory item created successfully",
            data: {
                item: formatInventoryItem(item),
            },
        }));
    }
    catch (err) {
        console.error("CREATE_INVENTORY_ITEM_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to create inventory item",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// List Inventory Items with Filtering + Pagination
async function listInventoryItems(req, res) {
    try {
        const ranchId = req.ranch.id;
        const page = Math.max(Number(req.query.page) || 1, 1);
        const requestedLimit = Number(req.query.limit) || 10;
        const limit = Math.min(Math.max(requestedLimit, 1), 100);
        const offset = (page - 1) * limit;
        const category = typeof req.query.category === "string"
            ? req.query.category.trim()
            : undefined;
        const search = typeof req.query.search === "string"
            ? req.query.search.trim()
            : undefined;
        const isActiveQuery = typeof req.query.isActive === "string"
            ? req.query.isActive.trim().toLowerCase()
            : undefined;
        const lowStockOnly = typeof req.query.lowStockOnly === "string" &&
            req.query.lowStockOnly.trim().toLowerCase() === "true";
        const whereClause = {
            ranch_id: ranchId,
        };
        if (isActiveQuery === "true") {
            whereClause.is_active = true;
        }
        else if (isActiveQuery === "false") {
            whereClause.is_active = false;
        }
        else {
            whereClause.is_active = true;
        }
        if (category) {
            whereClause.category = {
                [sequelize_1.Op.iLike]: category,
            };
        }
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.iLike]: `%${search}%` } },
                { category: { [sequelize_1.Op.iLike]: `%${search}%` } },
                { sku: { [sequelize_1.Op.iLike]: `%${search}%` } },
                { description: { [sequelize_1.Op.iLike]: `%${search}%` } },
            ];
        }
        if (lowStockOnly) {
            whereClause.is_active = true;
            whereClause.quantity_on_hand = {
                [sequelize_1.Op.lte]: models_1.sequelize.col("reorder_level"),
            };
        }
        const { count, rows } = await models_1.InventoryItem.findAndCountAll({
            where: whereClause,
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
            order: [["created_at", "DESC"]],
            limit,
            offset,
            distinct: true,
        });
        const totalItems = count;
        const totalPages = Math.ceil(totalItems / limit) || 1;
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Inventory items fetched successfully",
            data: {
                items: rows.map((item) => formatInventoryItem(item)),
            },
            meta: {
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
                filters: {
                    category: category ?? null,
                    search: search ?? null,
                    isActive: isActiveQuery === "true"
                        ? true
                        : isActiveQuery === "false"
                            ? false
                            : true,
                    lowStockOnly,
                },
            },
        }));
    }
    catch (err) {
        console.error("LIST_INVENTORY_ITEMS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list inventory items",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Inventory Summary
async function getInventorySummary(req, res) {
    try {
        const ranchId = req.ranch.id;
        const [totalItems, activeItems, inactiveItems, lowStockItems] = await Promise.all([
            models_1.InventoryItem.count({
                where: { ranch_id: ranchId },
            }),
            models_1.InventoryItem.count({
                where: { ranch_id: ranchId, is_active: true },
            }),
            models_1.InventoryItem.count({
                where: { ranch_id: ranchId, is_active: false },
            }),
            models_1.InventoryItem.count({
                where: {
                    ranch_id: ranchId,
                    is_active: true,
                    quantity_on_hand: {
                        [sequelize_1.Op.lte]: models_1.sequelize.col("reorder_level"),
                    },
                },
            }),
        ]);
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Inventory summary fetched successfully",
            data: {
                summary: {
                    totalItems,
                    activeItems,
                    inactiveItems,
                    lowStockItems,
                },
            },
        }));
    }
    catch (err) {
        console.error("GET_INVENTORY_SUMMARY_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch inventory summary",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Low Stock Inventory Items
async function listLowStockInventoryItems(req, res) {
    try {
        const ranchId = req.ranch.id;
        const items = await models_1.InventoryItem.findAll({
            where: {
                ranch_id: ranchId,
                is_active: true,
                quantity_on_hand: {
                    [sequelize_1.Op.lte]: models_1.sequelize.col("reorder_level"),
                },
            },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
            order: [["updated_at", "ASC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Low stock inventory items fetched successfully",
            data: {
                items: items.map((item) => formatInventoryItem(item)),
            },
        }));
    }
    catch (err) {
        console.error("LIST_LOW_STOCK_INVENTORY_ITEMS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch low stock inventory items",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Inventory Dashboard Analytics
async function getInventoryDashboard(req, res) {
    try {
        const ranchId = req.ranch.id;
        const [totalItems, activeItems, inactiveItems, lowStockItems, totalQuantityResult, categoryBreakdown,] = await Promise.all([
            models_1.InventoryItem.count({
                where: { ranch_id: ranchId },
            }),
            models_1.InventoryItem.count({
                where: { ranch_id: ranchId, is_active: true },
            }),
            models_1.InventoryItem.count({
                where: { ranch_id: ranchId, is_active: false },
            }),
            models_1.InventoryItem.count({
                where: {
                    ranch_id: ranchId,
                    is_active: true,
                    quantity_on_hand: {
                        [sequelize_1.Op.lte]: models_1.sequelize.col("reorder_level"),
                    },
                },
            }),
            models_1.InventoryItem.findOne({
                where: { ranch_id: ranchId },
                attributes: [
                    [
                        (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("quantity_on_hand")), 0),
                        "total_quantity_on_hand",
                    ],
                ],
                raw: true,
            }),
            models_1.InventoryItem.findAll({
                where: {
                    ranch_id: ranchId,
                    is_active: true,
                },
                attributes: [
                    "category",
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                    [
                        (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("quantity_on_hand")), 0),
                        "totalQuantityOnHand",
                    ],
                ],
                group: ["category"],
                order: [[(0, sequelize_1.literal)(`COUNT(id)`), "DESC"]],
                raw: true,
            }),
        ]);
        const totalQuantityOnHand = Number(totalQuantityResult?.total_quantity_on_hand ?? 0);
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Inventory dashboard analytics fetched successfully",
            data: {
                dashboard: {
                    totalItems,
                    activeItems,
                    inactiveItems,
                    lowStockItems,
                    totalQuantityOnHand,
                    categories: categoryBreakdown.map((row) => ({
                        category: row.category,
                        count: Number(row.count ?? 0),
                        totalQuantityOnHand: Number(row.totalQuantityOnHand ?? 0),
                    })),
                },
            },
        }));
    }
    catch (err) {
        console.error("GET_INVENTORY_DASHBOARD_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch inventory dashboard analytics",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Recent Inventory Movements
async function listRecentInventoryMovements(req, res) {
    try {
        const ranchId = req.ranch.id;
        const requestedLimit = Number(req.query.limit) || 10;
        const limit = Math.min(Math.max(requestedLimit, 1), 50);
        const movements = await models_1.InventoryStockMovement.findAll({
            where: {
                ranch_id: ranchId,
            },
            include: [
                {
                    model: models_1.InventoryItem,
                    as: "inventoryItem",
                },
                {
                    model: models_1.User,
                    as: "recordedByUser",
                },
            ],
            order: [["created_at", "DESC"]],
            limit,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Recent inventory movements fetched successfully",
            data: {
                movements: movements.map((movement) => {
                    const recordedByUser = movement.get("recordedByUser") ?? null;
                    const inventoryItem = movement.get("inventoryItem") ?? null;
                    return {
                        publicId: pickValue(movement, ["public_id", "publicId"]),
                        type: pickValue(movement, ["type"]),
                        quantity: Number(pickValue(movement, ["quantity"]) ?? 0),
                        previousQuantity: Number(pickValue(movement, ["previous_quantity", "previousQuantity"]) ?? 0),
                        newQuantity: Number(pickValue(movement, ["new_quantity", "newQuantity"]) ?? 0),
                        reason: pickValue(movement, ["reason"]),
                        referenceType: pickValue(movement, ["reference_type", "referenceType"]),
                        referencePublicId: pickValue(movement, [
                            "reference_public_id",
                            "referencePublicId",
                        ]),
                        createdAt: pickValue(movement, ["created_at", "createdAt"]),
                        item: inventoryItem
                            ? {
                                publicId: pickValue(inventoryItem, ["public_id", "publicId"]),
                                name: pickValue(inventoryItem, ["name"]),
                                category: pickValue(inventoryItem, ["category"]),
                                unit: pickValue(inventoryItem, ["unit"]),
                            }
                            : null,
                        recordedByUser: formatUser(recordedByUser),
                    };
                }),
            },
            meta: {
                limit,
            },
        }));
    }
    catch (err) {
        console.error("LIST_RECENT_INVENTORY_MOVEMENTS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch recent inventory movements",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Get Single Inventory Item
async function getInventoryItemByPublicId(req, res) {
    try {
        const ranchId = req.ranch.id;
        const { itemPublicId } = req.params;
        const item = await models_1.InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
        });
        if (!item) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Item not found",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Inventory item fetched successfully",
            data: {
                item: formatInventoryItem(item),
            },
        }));
    }
    catch (err) {
        console.error("GET_INVENTORY_ITEM_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch inventory item",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Update Inventory Item
async function updateInventoryItem(req, res) {
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { itemPublicId } = req.params;
        if (!inventory_helpers_1.ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Forbidden",
            }));
        }
        const parsed = inventory_validator_1.updateInventoryItemSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const validated = parsed.data;
        const item = await models_1.InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
        });
        if (!item) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Item not found",
            }));
        }
        await item.update({
            ...(validated.name !== undefined ? { name: validated.name } : {}),
            ...(validated.category !== undefined ? { category: validated.category } : {}),
            ...(validated.unit !== undefined ? { unit: validated.unit } : {}),
            ...(validated.sku !== undefined ? { sku: validated.sku } : {}),
            ...(validated.description !== undefined ? { description: validated.description } : {}),
            ...(validated.reorderLevel !== undefined
                ? { reorder_level: validated.reorderLevel }
                : {}),
            ...(validated.isActive !== undefined ? { is_active: validated.isActive } : {}),
            updated_by_user_id: userId,
        });
        const updatedItem = await models_1.InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Inventory item updated successfully",
            data: {
                item: formatInventoryItem(updatedItem),
            },
        }));
    }
    catch (err) {
        console.error("UPDATE_INVENTORY_ITEM_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to update inventory item",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Deactivate Inventory Item
async function deactivateInventoryItem(req, res) {
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { itemPublicId } = req.params;
        if (!inventory_helpers_1.ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Forbidden",
            }));
        }
        const item = await models_1.InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
        });
        if (!item) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Item not found",
            }));
        }
        if (!item.getDataValue("is_active")) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Inventory item is already inactive",
            }));
        }
        await item.update({
            is_active: false,
            updated_by_user_id: userId,
        });
        const updatedItem = await models_1.InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Inventory item deactivated successfully",
            data: {
                item: formatInventoryItem(updatedItem),
            },
        }));
    }
    catch (err) {
        console.error("DEACTIVATE_INVENTORY_ITEM_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to deactivate inventory item",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// Record Stock Movement
async function recordStockMovement(req, res) {
    const transaction = await models_1.sequelize.transaction();
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { itemPublicId } = req.params;
        if (!inventory_helpers_1.ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            await transaction.rollback();
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Forbidden",
            }));
        }
        const parsed = inventory_validator_1.createStockMovementSchema.safeParse(req.body);
        if (!parsed.success) {
            await transaction.rollback();
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const validated = parsed.data;
        const item = await models_1.InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
            transaction,
        });
        if (!item) {
            await transaction.rollback();
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Item not found",
            }));
        }
        if (!item.getDataValue("is_active")) {
            await transaction.rollback();
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Cannot record stock movement for an inactive item",
            }));
        }
        const previous = Number(item.getDataValue("quantity_on_hand"));
        const reorderLevel = Number(item.getDataValue("reorder_level"));
        const itemName = String(item.getDataValue("name"));
        const itemPublicIdResolved = String(item.getDataValue("public_id"));
        const itemInternalId = String(item.getDataValue("id"));
        let newQuantity = previous;
        if (validated.type === "stock_in") {
            newQuantity = previous + validated.quantity;
        }
        if (validated.type === "stock_out") {
            if (validated.quantity > previous) {
                await transaction.rollback();
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                    message: "Insufficient stock",
                }));
            }
            newQuantity = previous - validated.quantity;
        }
        if (validated.type === "adjustment") {
            newQuantity = validated.quantity;
        }
        await item.update({
            quantity_on_hand: newQuantity,
            updated_by_user_id: userId,
        }, { transaction });
        const createdMovement = await models_1.InventoryStockMovement.create({
            inventory_item_id: itemInternalId,
            ranch_id: ranchId,
            type: validated.type,
            quantity: validated.quantity,
            previous_quantity: previous,
            new_quantity: newQuantity,
            reason: validated.reason ?? null,
            reference_type: validated.referenceType ?? null,
            reference_public_id: validated.referencePublicId ?? null,
            recorded_by_user_id: userId,
        }, { transaction });
        await transaction.commit();
        const crossedIntoLowStock = previous > reorderLevel && newQuantity <= reorderLevel;
        if (crossedIntoLowStock) {
            await (0, ranchAlert_service_1.createRanchAlert)({
                ranchId,
                alertType: "low_stock",
                title: "Low stock alert",
                message: `${itemName} is low on stock (${newQuantity} remaining, reorder level: ${reorderLevel})`,
                priority: "high",
                entityType: "inventory_item",
                entityPublicId: itemPublicIdResolved,
                dedupe: true,
                dedupeMinutes: 60,
            });
        }
        const movement = await models_1.InventoryStockMovement.findOne({
            where: {
                id: createdMovement.getDataValue("id"),
            },
            include: [{ model: models_1.User, as: "recordedByUser" }],
        });
        const recordedByUser = movement?.get("recordedByUser") ?? null;
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Stock movement recorded successfully",
            data: {
                movement: {
                    publicId: pickValue(movement, ["public_id", "publicId"]),
                    type: pickValue(movement, ["type"]),
                    quantity: Number(pickValue(movement, ["quantity"]) ?? 0),
                    previousQuantity: Number(pickValue(movement, ["previous_quantity", "previousQuantity"]) ?? 0),
                    newQuantity: Number(pickValue(movement, ["new_quantity", "newQuantity"]) ?? 0),
                    reason: pickValue(movement, ["reason"]),
                    referenceType: pickValue(movement, ["reference_type", "referenceType"]),
                    referencePublicId: pickValue(movement, [
                        "reference_public_id",
                        "referencePublicId",
                    ]),
                    createdAt: pickValue(movement, ["created_at", "createdAt"]),
                    recordedByUser: formatUser(recordedByUser),
                },
                item: {
                    publicId: itemPublicIdResolved,
                    quantityOnHand: newQuantity,
                },
            },
        }));
    }
    catch (err) {
        await transaction.rollback();
        console.error("RECORD_STOCK_MOVEMENT_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to record stock movement",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// List Stock Movements
async function listStockMovements(req, res) {
    try {
        const ranchId = req.ranch.id;
        const { itemPublicId } = req.params;
        const item = await models_1.InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
        });
        if (!item) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Item not found",
            }));
        }
        const movements = await models_1.InventoryStockMovement.findAll({
            where: {
                inventory_item_id: item.getDataValue("id"),
            },
            include: [{ model: models_1.User, as: "recordedByUser" }],
            order: [["created_at", "DESC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Stock movements fetched successfully",
            data: {
                item: {
                    publicId: item.getDataValue("public_id"),
                    name: item.getDataValue("name"),
                    quantityOnHand: Number(item.getDataValue("quantity_on_hand")),
                    isActive: item.getDataValue("is_active"),
                },
                movements: movements.map((movement) => {
                    const recordedByUser = movement.get("recordedByUser") ?? null;
                    return {
                        publicId: pickValue(movement, ["public_id", "publicId"]),
                        type: pickValue(movement, ["type"]),
                        quantity: Number(pickValue(movement, ["quantity"]) ?? 0),
                        previousQuantity: Number(pickValue(movement, ["previous_quantity", "previousQuantity"]) ?? 0),
                        newQuantity: Number(pickValue(movement, ["new_quantity", "newQuantity"]) ?? 0),
                        reason: pickValue(movement, ["reason"]),
                        referenceType: pickValue(movement, [
                            "reference_type",
                            "referenceType",
                        ]),
                        referencePublicId: pickValue(movement, [
                            "reference_public_id",
                            "referencePublicId",
                        ]),
                        createdAt: pickValue(movement, ["created_at", "createdAt"]),
                        recordedByUser: formatUser(recordedByUser),
                    };
                }),
            },
        }));
    }
    catch (err) {
        console.error("LIST_STOCK_MOVEMENTS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list stock movements",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function uploadInventoryItemImage(req, res) {
    try {
        const ranchId = req.ranch.id;
        const ranchRole = req.membership.ranchRole;
        const { itemPublicId } = req.params;
        if (!inventory_helpers_1.ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Forbidden",
            }));
        }
        if (!req.file) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({ message: "Image file is required" }));
        }
        const item = await models_1.InventoryItem.findOne({
            where: { public_id: itemPublicId, ranch_id: ranchId },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
        });
        if (!item) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({ message: "Inventory item not found" }));
        }
        const existingImagePublicId = pickValue(item, [
            "image_public_id",
            "imagePublicId",
        ]);
        if (existingImagePublicId) {
            await cloudinary_1.v2.uploader.destroy(String(existingImagePublicId));
        }
        const itemPublicIdResolved = String(pickValue(item, ["public_id", "publicId"]));
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, `smartruga/inventory/${ranchId}`, `inventory-item-${itemPublicIdResolved}`);
        await item.update({
            image_url: uploadResult.secure_url,
            image_public_id: uploadResult.public_id,
        });
        const updatedItem = await models_1.InventoryItem.findOne({
            where: { public_id: itemPublicId, ranch_id: ranchId },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Inventory image uploaded successfully",
            data: {
                item: formatInventoryItem(updatedItem),
            },
        }));
    }
    catch (err) {
        console.error("UPLOAD_INVENTORY_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to upload inventory image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function removeInventoryItemImage(req, res) {
    try {
        const ranchId = req.ranch.id;
        const ranchRole = req.membership.ranchRole;
        const { itemPublicId } = req.params;
        if (!inventory_helpers_1.ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Forbidden",
            }));
        }
        const item = await models_1.InventoryItem.findOne({
            where: { public_id: itemPublicId, ranch_id: ranchId },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
        });
        if (!item) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({ message: "Inventory item not found" }));
        }
        const imagePublicId = pickValue(item, [
            "image_public_id",
            "imagePublicId",
        ]);
        if (!imagePublicId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({ message: "Item has no image" }));
        }
        await cloudinary_1.v2.uploader.destroy(String(imagePublicId));
        await item.update({
            image_url: null,
            image_public_id: null,
        });
        const updatedItem = await models_1.InventoryItem.findOne({
            where: { public_id: itemPublicId, ranch_id: ranchId },
            include: [
                { model: models_1.User, as: "createdByUser" },
                { model: models_1.User, as: "updatedByUser" },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Inventory image removed successfully",
            data: {
                item: formatInventoryItem(updatedItem),
            },
        }));
    }
    catch (err) {
        console.error("REMOVE_INVENTORY_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to remove inventory image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
