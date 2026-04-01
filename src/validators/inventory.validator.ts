import { z } from "zod";

export const createInventoryItemSchema = z.object({
    name: z.string().trim().min(1).max(150),
    category: z.string().trim().min(1).max(100),
    unit: z.string().trim().min(1).max(50),
    sku: z.string().trim().max(100).optional().nullable(),
    description: z.string().trim().max(5000).optional().nullable(),
    quantityOnHand: z.number().min(0),
    reorderLevel: z.number().min(0),
});

export const updateInventoryItemSchema = z.object({
    name: z.string().trim().min(1).max(150).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    unit: z.string().trim().min(1).max(50).optional(),
    sku: z.string().trim().max(100).optional().nullable(),
    description: z.string().trim().max(5000).optional().nullable(),
    reorderLevel: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
});

export const createStockMovementSchema = z.object({
    type: z.enum(["stock_in", "stock_out", "adjustment"]),
    quantity: z.number().positive(),
    reason: z.string().trim().max(3000).optional().nullable(),
    referenceType: z.string().trim().max(100).optional().nullable(),
    referencePublicId: z.string().uuid().optional().nullable(),
});