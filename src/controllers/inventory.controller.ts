import { v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";
import { Op, WhereOptions, fn, col, literal } from "sequelize";
import { StatusCodes } from "http-status-codes";
import {
    sequelize,
    InventoryItem,
    InventoryStockMovement,
    User,
} from "../models";
import {
    createInventoryItemSchema,
    createStockMovementSchema,
    updateInventoryItemSchema,
} from "../validators/inventory.validator";
import { ALLOWED_INVENTORY_MANAGERS } from "../helpers/inventory.helpers";
import { createRanchAlert } from "../services/ranchAlert.service";
import { errorResponse, successResponse } from "../utils/apiResponse";

function pickValue(obj: any, keys: string[]) {
    if (!obj) return null;

    for (const key of keys) {
        const value =
            obj?.getDataValue?.(key) ??
            obj?.dataValues?.[key] ??
            obj?.[key];

        if (value !== undefined && value !== null) {
            return value;
        }
    }

    return null;
}

function formatUser(user: any) {
    if (!user) return null;

    const firstName = pickValue(user, ["first_name", "firstName"]);
    const lastName = pickValue(user, ["last_name", "lastName"]);
    const combinedName =
        [firstName, lastName].filter(Boolean).join(" ").trim() || null;

    return {
        publicId: pickValue(user, ["public_id", "publicId"]),
        name: pickValue(user, ["name", "full_name", "fullName"]) ?? combinedName,
        email: pickValue(user, ["email"]),
    };
}

function formatInventoryItem(item: any) {
    const quantityOnHand = Number(
        pickValue(item, ["quantity_on_hand", "quantityOnHand"]) ?? 0
    );

    const reorderLevel = Number(
        pickValue(item, ["reorder_level", "reorderLevel"]) ?? 0
    );

    const createdByUser = item?.get?.("createdByUser") ?? item?.createdByUser;
    const updatedByUser = item?.get?.("updatedByUser") ?? item?.updatedByUser;

    return {
        publicId: pickValue(item, ["public_id", "publicId"]),
        name: pickValue(item, ["name"]),
        category: pickValue(item, ["category"]),
        unit: pickValue(item, ["unit"]),
        sku: pickValue(item, ["sku"]),
        description: pickValue(item, ["description"]),

        // ✅ ADD THESE
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

function uploadBufferToCloudinary(
    fileBuffer: Buffer,
    folder: string,
    publicId: string
): Promise<{ secure_url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                resource_type: "image",
                overwrite: true,
            },
            (error, result) => {
                if (error || !result) {
                    reject(error ?? new Error("Image upload failed"));
                    return;
                }

                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                });
            }
        );

        stream.end(fileBuffer);
    });
}

// Create Inventory Item
export async function createInventoryItem(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;

        if (!ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Forbidden",
                })
            );
        }

        const parsed = createInventoryItemSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const validated = parsed.data;

        const createdItem = await InventoryItem.create({
            ranch_id: ranchId,
            name: validated.name,
            category: validated.category,
            unit: validated.unit,
            sku: validated.sku ?? null,
            description: validated.description ?? null,
            quantity_on_hand: validated.quantityOnHand,
            reorder_level: validated.reorderLevel,
            is_active: true,
            created_by_user_id: userId,
            updated_by_user_id: userId,
        });

        const item = await InventoryItem.findOne({
            where: {
                id: createdItem.getDataValue("id"),
            },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
        });

        return res.status(StatusCodes.CREATED).json(
            successResponse({
                message: "Inventory item created successfully",
                data: {
                    item: formatInventoryItem(item),
                },
            })
        );
    } catch (err: any) {
        console.error("CREATE_INVENTORY_ITEM_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to create inventory item",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// List Inventory Items with Filtering + Pagination
export async function listInventoryItems(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;

        const page = Math.max(Number(req.query.page) || 1, 1);
        const requestedLimit = Number(req.query.limit) || 10;
        const limit = Math.min(Math.max(requestedLimit, 1), 100);
        const offset = (page - 1) * limit;

        const category =
            typeof req.query.category === "string"
                ? req.query.category.trim()
                : undefined;

        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim()
                : undefined;

        const isActiveQuery =
            typeof req.query.isActive === "string"
                ? req.query.isActive.trim().toLowerCase()
                : undefined;

        const lowStockOnly =
            typeof req.query.lowStockOnly === "string" &&
            req.query.lowStockOnly.trim().toLowerCase() === "true";

        const whereClause: WhereOptions = {
            ranch_id: ranchId,
        };

        if (isActiveQuery === "true") {
            (whereClause as any).is_active = true;
        } else if (isActiveQuery === "false") {
            (whereClause as any).is_active = false;
        } else {
            (whereClause as any).is_active = true;
        }

        if (category) {
            (whereClause as any).category = {
                [Op.iLike]: category,
            };
        }

        if (search) {
            (whereClause as any)[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { category: { [Op.iLike]: `%${search}%` } },
                { sku: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
            ];
        }

        if (lowStockOnly) {
            (whereClause as any).is_active = true;
            (whereClause as any).quantity_on_hand = {
                [Op.lte]: sequelize.col("reorder_level"),
            };
        }

        const { count, rows } = await InventoryItem.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
            order: [["created_at", "DESC"]],
            limit,
            offset,
            distinct: true,
        });

        const totalItems = count;
        const totalPages = Math.ceil(totalItems / limit) || 1;

        return res.status(StatusCodes.OK).json(
            successResponse({
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
                        isActive:
                            isActiveQuery === "true"
                                ? true
                                : isActiveQuery === "false"
                                    ? false
                                    : true,
                        lowStockOnly,
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("LIST_INVENTORY_ITEMS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to list inventory items",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// Inventory Summary
export async function getInventorySummary(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;

        const [totalItems, activeItems, inactiveItems, lowStockItems] =
            await Promise.all([
                InventoryItem.count({
                    where: { ranch_id: ranchId },
                }),
                InventoryItem.count({
                    where: { ranch_id: ranchId, is_active: true },
                }),
                InventoryItem.count({
                    where: { ranch_id: ranchId, is_active: false },
                }),
                InventoryItem.count({
                    where: {
                        ranch_id: ranchId,
                        is_active: true,
                        quantity_on_hand: {
                            [Op.lte]: sequelize.col("reorder_level"),
                        },
                    },
                }),
            ]);

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Inventory summary fetched successfully",
                data: {
                    summary: {
                        totalItems,
                        activeItems,
                        inactiveItems,
                        lowStockItems,
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("GET_INVENTORY_SUMMARY_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch inventory summary",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// Low Stock Inventory Items
export async function listLowStockInventoryItems(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;

        const items = await InventoryItem.findAll({
            where: {
                ranch_id: ranchId,
                is_active: true,
                quantity_on_hand: {
                    [Op.lte]: sequelize.col("reorder_level"),
                },
            },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
            order: [["updated_at", "ASC"]],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Low stock inventory items fetched successfully",
                data: {
                    items: items.map((item) => formatInventoryItem(item)),
                },
            })
        );
    } catch (err: any) {
        console.error("LIST_LOW_STOCK_INVENTORY_ITEMS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch low stock inventory items",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// Inventory Dashboard Analytics
export async function getInventoryDashboard(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;

        const [
            totalItems,
            activeItems,
            inactiveItems,
            lowStockItems,
            totalQuantityResult,
            categoryBreakdown,
        ] = await Promise.all([
            InventoryItem.count({
                where: { ranch_id: ranchId },
            }),
            InventoryItem.count({
                where: { ranch_id: ranchId, is_active: true },
            }),
            InventoryItem.count({
                where: { ranch_id: ranchId, is_active: false },
            }),
            InventoryItem.count({
                where: {
                    ranch_id: ranchId,
                    is_active: true,
                    quantity_on_hand: {
                        [Op.lte]: sequelize.col("reorder_level"),
                    },
                },
            }),
            InventoryItem.findOne({
                where: { ranch_id: ranchId },
                attributes: [
                    [
                        fn("COALESCE", fn("SUM", col("quantity_on_hand")), 0),
                        "total_quantity_on_hand",
                    ],
                ],
                raw: true,
            }),
            InventoryItem.findAll({
                where: {
                    ranch_id: ranchId,
                    is_active: true,
                },
                attributes: [
                    "category",
                    [fn("COUNT", col("id")), "count"],
                    [
                        fn("COALESCE", fn("SUM", col("quantity_on_hand")), 0),
                        "totalQuantityOnHand",
                    ],
                ],
                group: ["category"],
                order: [[literal(`COUNT(id)`), "DESC"]],
                raw: true,
            }),
        ]);

        const totalQuantityOnHand = Number(
            (totalQuantityResult as any)?.total_quantity_on_hand ?? 0
        );

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Inventory dashboard analytics fetched successfully",
                data: {
                    dashboard: {
                        totalItems,
                        activeItems,
                        inactiveItems,
                        lowStockItems,
                        totalQuantityOnHand,
                        categories: (categoryBreakdown as any[]).map((row) => ({
                            category: row.category,
                            count: Number(row.count ?? 0),
                            totalQuantityOnHand: Number(row.totalQuantityOnHand ?? 0),
                        })),
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("GET_INVENTORY_DASHBOARD_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch inventory dashboard analytics",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// Recent Inventory Movements
export async function listRecentInventoryMovements(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const requestedLimit = Number(req.query.limit) || 10;
        const limit = Math.min(Math.max(requestedLimit, 1), 50);

        const movements = await InventoryStockMovement.findAll({
            where: {
                ranch_id: ranchId,
            },
            include: [
                {
                    model: InventoryItem,
                    as: "inventoryItem",
                },
                {
                    model: User,
                    as: "recordedByUser",
                },
            ],
            order: [["created_at", "DESC"]],
            limit,
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Recent inventory movements fetched successfully",
                data: {
                    movements: movements.map((movement: any) => {
                        const recordedByUser = movement.get("recordedByUser") ?? null;
                        const inventoryItem = movement.get("inventoryItem") ?? null;

                        return {
                            publicId: pickValue(movement, ["public_id", "publicId"]),
                            type: pickValue(movement, ["type"]),
                            quantity: Number(pickValue(movement, ["quantity"]) ?? 0),
                            previousQuantity: Number(
                                pickValue(movement, ["previous_quantity", "previousQuantity"]) ?? 0
                            ),
                            newQuantity: Number(
                                pickValue(movement, ["new_quantity", "newQuantity"]) ?? 0
                            ),
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
            })
        );
    } catch (err: any) {
        console.error("LIST_RECENT_INVENTORY_MOVEMENTS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch recent inventory movements",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// Get Single Inventory Item
export async function getInventoryItemByPublicId(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { itemPublicId } = req.params;

        const item = await InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
        });

        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Item not found",
                })
            );
        }

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Inventory item fetched successfully",
                data: {
                    item: formatInventoryItem(item),
                },
            })
        );
    } catch (err: any) {
        console.error("GET_INVENTORY_ITEM_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch inventory item",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// Update Inventory Item
export async function updateInventoryItem(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { itemPublicId } = req.params;

        if (!ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Forbidden",
                })
            );
        }

        const parsed = updateInventoryItemSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const validated = parsed.data;

        const item = await InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
        });

        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Item not found",
                })
            );
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

        const updatedItem = await InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Inventory item updated successfully",
                data: {
                    item: formatInventoryItem(updatedItem),
                },
            })
        );
    } catch (err: any) {
        console.error("UPDATE_INVENTORY_ITEM_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to update inventory item",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// Deactivate Inventory Item
export async function deactivateInventoryItem(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { itemPublicId } = req.params;

        if (!ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Forbidden",
                })
            );
        }

        const item = await InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
        });

        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Item not found",
                })
            );
        }

        if (!item.getDataValue("is_active")) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Inventory item is already inactive",
                })
            );
        }

        await item.update({
            is_active: false,
            updated_by_user_id: userId,
        });

        const updatedItem = await InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Inventory item deactivated successfully",
                data: {
                    item: formatInventoryItem(updatedItem),
                },
            })
        );
    } catch (err: any) {
        console.error("DEACTIVATE_INVENTORY_ITEM_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to deactivate inventory item",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// Record Stock Movement
export async function recordStockMovement(req: Request, res: Response) {
    const transaction = await sequelize.transaction();

    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { itemPublicId } = req.params;

        if (!ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            await transaction.rollback();
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Forbidden",
                })
            );
        }

        const parsed = createStockMovementSchema.safeParse(req.body);

        if (!parsed.success) {
            await transaction.rollback();
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const validated = parsed.data;

        const item = await InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
            transaction,
        });

        if (!item) {
            await transaction.rollback();
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Item not found",
                })
            );
        }

        if (!item.getDataValue("is_active")) {
            await transaction.rollback();
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Cannot record stock movement for an inactive item",
                })
            );
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
                return res.status(StatusCodes.BAD_REQUEST).json(
                    errorResponse({
                        message: "Insufficient stock",
                    })
                );
            }

            newQuantity = previous - validated.quantity;
        }

        if (validated.type === "adjustment") {
            newQuantity = validated.quantity;
        }

        await item.update(
            {
                quantity_on_hand: newQuantity,
                updated_by_user_id: userId,
            },
            { transaction }
        );

        const createdMovement = await InventoryStockMovement.create(
            {
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
            },
            { transaction }
        );

        await transaction.commit();

        const crossedIntoLowStock =
            previous > reorderLevel && newQuantity <= reorderLevel;

        if (crossedIntoLowStock) {
            await createRanchAlert({
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

        const movement = await InventoryStockMovement.findOne({
            where: {
                id: createdMovement.getDataValue("id"),
            },
            include: [{ model: User, as: "recordedByUser" }],
        });

        const recordedByUser = movement?.get("recordedByUser") ?? null;

        return res.status(StatusCodes.CREATED).json(
            successResponse({
                message: "Stock movement recorded successfully",
                data: {
                    movement: {
                        publicId: pickValue(movement, ["public_id", "publicId"]),
                        type: pickValue(movement, ["type"]),
                        quantity: Number(pickValue(movement, ["quantity"]) ?? 0),
                        previousQuantity: Number(
                            pickValue(movement, ["previous_quantity", "previousQuantity"]) ?? 0
                        ),
                        newQuantity: Number(
                            pickValue(movement, ["new_quantity", "newQuantity"]) ?? 0
                        ),
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
            })
        );
    } catch (err: any) {
        await transaction.rollback();
        console.error("RECORD_STOCK_MOVEMENT_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to record stock movement",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// List Stock Movements
export async function listStockMovements(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { itemPublicId } = req.params;

        const item = await InventoryItem.findOne({
            where: {
                public_id: itemPublicId,
                ranch_id: ranchId,
            },
        });

        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Item not found",
                })
            );
        }

        const movements = await InventoryStockMovement.findAll({
            where: {
                inventory_item_id: item.getDataValue("id"),
            },
            include: [{ model: User, as: "recordedByUser" }],
            order: [["created_at", "DESC"]],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Stock movements fetched successfully",
                data: {
                    item: {
                        publicId: item.getDataValue("public_id"),
                        name: item.getDataValue("name"),
                        quantityOnHand: Number(item.getDataValue("quantity_on_hand")),
                        isActive: item.getDataValue("is_active"),
                    },
                    movements: movements.map((movement: any) => {
                        const recordedByUser = movement.get("recordedByUser") ?? null;

                        return {
                            publicId: pickValue(movement, ["public_id", "publicId"]),
                            type: pickValue(movement, ["type"]),
                            quantity: Number(pickValue(movement, ["quantity"]) ?? 0),
                            previousQuantity: Number(
                                pickValue(movement, ["previous_quantity", "previousQuantity"]) ?? 0
                            ),
                            newQuantity: Number(
                                pickValue(movement, ["new_quantity", "newQuantity"]) ?? 0
                            ),
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
            })
        );
    } catch (err: any) {
        console.error("LIST_STOCK_MOVEMENTS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to list stock movements",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function uploadInventoryItemImage(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const ranchRole = req.membership!.ranchRole;
        const { itemPublicId } = req.params;

        if (!ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Forbidden",
                })
            );
        }

        if (!req.file) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({ message: "Image file is required" })
            );
        }

        const item = await InventoryItem.findOne({
            where: { public_id: itemPublicId, ranch_id: ranchId },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
        });

        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({ message: "Inventory item not found" })
            );
        }

        const existingImagePublicId = pickValue(item, [
            "image_public_id",
            "imagePublicId",
        ]);

        if (existingImagePublicId) {
            await cloudinary.uploader.destroy(String(existingImagePublicId));
        }

        const itemPublicIdResolved = String(
            pickValue(item, ["public_id", "publicId"])
        );

        const uploadResult = await uploadBufferToCloudinary(
            req.file.buffer,
            `smartruga/inventory/${ranchId}`,
            `inventory-item-${itemPublicIdResolved}`
        );

        await item.update({
            image_url: uploadResult.secure_url,
            image_public_id: uploadResult.public_id,
        });

        const updatedItem = await InventoryItem.findOne({
            where: { public_id: itemPublicId, ranch_id: ranchId },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Inventory image uploaded successfully",
                data: {
                    item: formatInventoryItem(updatedItem),
                },
            })
        );
    } catch (err: any) {
        console.error("UPLOAD_INVENTORY_IMAGE_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to upload inventory image",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function removeInventoryItemImage(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const ranchRole = req.membership!.ranchRole;
        const { itemPublicId } = req.params;

        if (!ALLOWED_INVENTORY_MANAGERS.includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Forbidden",
                })
            );
        }

        const item = await InventoryItem.findOne({
            where: { public_id: itemPublicId, ranch_id: ranchId },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
        });

        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({ message: "Inventory item not found" })
            );
        }

        const imagePublicId = pickValue(item, [
            "image_public_id",
            "imagePublicId",
        ]);

        if (!imagePublicId) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({ message: "Item has no image" })
            );
        }

        await cloudinary.uploader.destroy(String(imagePublicId));

        await item.update({
            image_url: null,
            image_public_id: null,
        });

        const updatedItem = await InventoryItem.findOne({
            where: { public_id: itemPublicId, ranch_id: ranchId },
            include: [
                { model: User, as: "createdByUser" },
                { model: User, as: "updatedByUser" },
            ],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Inventory image removed successfully",
                data: {
                    item: formatInventoryItem(updatedItem),
                },
            })
        );
    } catch (err: any) {
        console.error("REMOVE_INVENTORY_IMAGE_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to remove inventory image",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}