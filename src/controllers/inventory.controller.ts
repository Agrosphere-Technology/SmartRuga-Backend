import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sequelize, InventoryItem, InventoryStockMovement } from "../models";
import {
    createInventoryItemSchema,
    createStockMovementSchema,
} from "../validators/inventory.validator";

// Create Inventory Item
export async function createInventoryItem(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;

        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Forbidden",
            });
        }

        const parsed = createInventoryItemSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            });
        }

        const validated = parsed.data;

        const item = await InventoryItem.create({
            ranch_id: ranchId,
            name: validated.name,
            category: validated.category,
            unit: validated.unit,
            sku: validated.sku ?? null,
            description: validated.description ?? null,
            quantity_on_hand: validated.quantityOnHand,
            reorder_level: validated.reorderLevel,
            created_by_user_id: userId,
        });

        return res.status(StatusCodes.CREATED).json({
            message: "Inventory item created successfully",
            item: {
                publicId: item.getDataValue("public_id"),
                name: item.getDataValue("name"),
                category: item.getDataValue("category"),
                unit: item.getDataValue("unit"),
                quantityOnHand: Number(item.getDataValue("quantity_on_hand")),
                reorderLevel: Number(item.getDataValue("reorder_level")),
                isActive: item.getDataValue("is_active"),
                createdAt: item.getDataValue("created_at"),
            },
        });
    } catch (err: any) {
        console.error("CREATE_INVENTORY_ITEM_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to create inventory item",
            error: err?.message ?? "Unknown error",
        });
    }
}

// List Inventory Items
export async function listInventoryItems(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;

        const items = await InventoryItem.findAll({
            where: {
                ranch_id: ranchId,
                is_active: true,
            },
            order: [["created_at", "DESC"]],
        });

        return res.status(StatusCodes.OK).json({
            items: items.map((item) => {
                const quantityOnHand = Number(item.getDataValue("quantity_on_hand"));
                const reorderLevel = Number(item.getDataValue("reorder_level"));

                return {
                    publicId: item.getDataValue("public_id"),
                    name: item.getDataValue("name"),
                    category: item.getDataValue("category"),
                    unit: item.getDataValue("unit"),
                    sku: item.getDataValue("sku"),
                    description: item.getDataValue("description"),
                    quantityOnHand,
                    reorderLevel,
                    isLowStock: quantityOnHand <= reorderLevel,
                    isActive: item.getDataValue("is_active"),
                    createdAt: item.getDataValue("created_at"),
                    updatedAt: item.getDataValue("updated_at"),
                };
            }),
        });
    } catch (err: any) {
        console.error("LIST_INVENTORY_ITEMS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list inventory items",
            error: err?.message ?? "Unknown error",
        });
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
        });

        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Item not found",
            });
        }

        const quantityOnHand = Number(item.getDataValue("quantity_on_hand"));
        const reorderLevel = Number(item.getDataValue("reorder_level"));

        return res.status(StatusCodes.OK).json({
            item: {
                publicId: item.getDataValue("public_id"),
                name: item.getDataValue("name"),
                category: item.getDataValue("category"),
                unit: item.getDataValue("unit"),
                sku: item.getDataValue("sku"),
                description: item.getDataValue("description"),
                quantityOnHand,
                reorderLevel,
                isLowStock: quantityOnHand <= reorderLevel,
                isActive: item.getDataValue("is_active"),
                createdAt: item.getDataValue("created_at"),
                updatedAt: item.getDataValue("updated_at"),
            },
        });
    } catch (err: any) {
        console.error("GET_INVENTORY_ITEM_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch inventory item",
            error: err?.message ?? "Unknown error",
        });
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

        if (!["owner", "manager"].includes(ranchRole)) {
            await transaction.rollback();
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Forbidden",
            });
        }

        const parsed = createStockMovementSchema.safeParse(req.body);

        if (!parsed.success) {
            await transaction.rollback();
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            });
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
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Item not found",
            });
        }

        const previous = Number(item.getDataValue("quantity_on_hand"));
        let newQuantity = previous;

        if (validated.type === "stock_in") {
            newQuantity = previous + validated.quantity;
        }

        if (validated.type === "stock_out") {
            if (validated.quantity > previous) {
                await transaction.rollback();
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: "Insufficient stock",
                });
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

        const movement = await InventoryStockMovement.create(
            {
                inventory_item_id: item.getDataValue("id"),
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

        return res.status(StatusCodes.CREATED).json({
            message: "Stock movement recorded successfully",
            movement: {
                publicId: movement.getDataValue("public_id"),
                type: movement.getDataValue("type"),
                quantity: Number(movement.getDataValue("quantity")),
                previousQuantity: Number(movement.getDataValue("previous_quantity")),
                newQuantity: Number(movement.getDataValue("new_quantity")),
                reason: movement.getDataValue("reason"),
                createdAt: movement.getDataValue("created_at"),
            },
            item: {
                publicId: item.getDataValue("public_id"),
                quantityOnHand: newQuantity,
            },
        });
    } catch (err: any) {
        await transaction.rollback();
        console.error("RECORD_STOCK_MOVEMENT_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to record stock movement",
            error: err?.message ?? "Unknown error",
        });
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
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Item not found",
            });
        }

        const movements = await InventoryStockMovement.findAll({
            where: {
                inventory_item_id: item.getDataValue("id"),
            },
            order: [["created_at", "DESC"]],
        });

        return res.status(StatusCodes.OK).json({
            item: {
                publicId: item.getDataValue("public_id"),
                name: item.getDataValue("name"),
                quantityOnHand: Number(item.getDataValue("quantity_on_hand")),
            },
            movements: movements.map((m) => ({
                publicId: m.getDataValue("public_id"),
                type: m.getDataValue("type"),
                quantity: Number(m.getDataValue("quantity")),
                previousQuantity: Number(m.getDataValue("previous_quantity")),
                newQuantity: Number(m.getDataValue("new_quantity")),
                reason: m.getDataValue("reason"),
                referenceType: m.getDataValue("reference_type"),
                referencePublicId: m.getDataValue("reference_public_id"),
                createdAt: m.getDataValue("created_at"),
            })),
        });
    } catch (err: any) {
        console.error("LIST_STOCK_MOVEMENTS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list stock movements",
            error: err?.message ?? "Unknown error",
        });
    }
}