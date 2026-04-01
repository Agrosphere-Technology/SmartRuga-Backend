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

export const createStockMovementSchema = z
    .object({
        type: z.enum(["stock_in", "stock_out", "adjustment"]),
        quantity: z.number(),
        reason: z.string().trim().max(3000).optional().nullable(),
        referenceType: z.string().trim().max(100).optional().nullable(),
        referencePublicId: z.string().uuid().optional().nullable(),
    })
    .superRefine((data, ctx) => {
        if (
            (data.type === "stock_in" || data.type === "stock_out") &&
            data.quantity <= 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["quantity"],
                message: "Quantity must be greater than 0 for stock_in or stock_out",
            });
        }

        if (data.type === "adjustment" && data.quantity < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["quantity"],
                message: "Quantity cannot be negative for adjustment",
            });
        }
    });