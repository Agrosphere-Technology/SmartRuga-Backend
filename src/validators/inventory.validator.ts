import { z } from "zod";

const nonNegativeNumber = z
    .number({
        error: (issue) =>
            issue.input === undefined ? "This field is required" : "Must be a number",
    })
    .refine((value) => Number.isFinite(value), {
        message: "Must be a valid number",
    })
    .min(0);

const optionalNullableTrimmedString = (max: number) =>
    z.string().trim().max(max).optional().nullable();

export const createInventoryItemSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(150),
    category: z.string().trim().min(1, "Category is required").max(100),
    unit: z.string().trim().min(1, "Unit is required").max(50),
    sku: optionalNullableTrimmedString(100),
    description: optionalNullableTrimmedString(5000),
    quantityOnHand: nonNegativeNumber,
    reorderLevel: nonNegativeNumber,
});

export const updateInventoryItemSchema = z.object({
    name: z.string().trim().min(1, "Name cannot be empty").max(150).optional(),
    category: z.string().trim().min(1, "Category cannot be empty").max(100).optional(),
    unit: z.string().trim().min(1, "Unit cannot be empty").max(50).optional(),
    sku: optionalNullableTrimmedString(100),
    description: optionalNullableTrimmedString(5000),
    reorderLevel: nonNegativeNumber.optional(),
    isActive: z.boolean().optional(),
});

export const createStockMovementSchema = z
    .object({
        type: z.enum(["stock_in", "stock_out", "adjustment"]),
        quantity: z
            .number({
                error: (issue) =>
                    issue.input === undefined
                        ? "Quantity is required"
                        : "Quantity must be a number",
            })
            .refine((value) => Number.isFinite(value), {
                message: "Quantity must be a valid number",
            }),
        reason: optionalNullableTrimmedString(3000),
        referenceType: optionalNullableTrimmedString(100),
        referencePublicId: z
            .string()
            .uuid("referencePublicId must be a valid UUID")
            .optional()
            .nullable(),
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