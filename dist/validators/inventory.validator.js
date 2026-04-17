"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStockMovementSchema = exports.updateInventoryItemSchema = exports.createInventoryItemSchema = void 0;
const zod_1 = require("zod");
const nonNegativeNumber = zod_1.z
    .number({
    error: (issue) => issue.input === undefined ? "This field is required" : "Must be a number",
})
    .refine((value) => Number.isFinite(value), {
    message: "Must be a valid number",
})
    .min(0);
const optionalNullableTrimmedString = (max) => zod_1.z.string().trim().max(max).optional().nullable();
exports.createInventoryItemSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, "Name is required").max(150),
    category: zod_1.z.string().trim().min(1, "Category is required").max(100),
    unit: zod_1.z.string().trim().min(1, "Unit is required").max(50),
    sku: optionalNullableTrimmedString(100),
    description: optionalNullableTrimmedString(5000),
    quantityOnHand: nonNegativeNumber,
    reorderLevel: nonNegativeNumber,
});
exports.updateInventoryItemSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, "Name cannot be empty").max(150).optional(),
    category: zod_1.z.string().trim().min(1, "Category cannot be empty").max(100).optional(),
    unit: zod_1.z.string().trim().min(1, "Unit cannot be empty").max(50).optional(),
    sku: optionalNullableTrimmedString(100),
    description: optionalNullableTrimmedString(5000),
    reorderLevel: nonNegativeNumber.optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.createStockMovementSchema = zod_1.z
    .object({
    type: zod_1.z.enum(["stock_in", "stock_out", "adjustment"]),
    quantity: zod_1.z
        .number({
        error: (issue) => issue.input === undefined
            ? "Quantity is required"
            : "Quantity must be a number",
    })
        .refine((value) => Number.isFinite(value), {
        message: "Quantity must be a valid number",
    }),
    reason: optionalNullableTrimmedString(3000),
    referenceType: optionalNullableTrimmedString(100),
    referencePublicId: zod_1.z
        .string()
        .uuid("referencePublicId must be a valid UUID")
        .optional()
        .nullable(),
})
    .superRefine((data, ctx) => {
    if ((data.type === "stock_in" || data.type === "stock_out") &&
        data.quantity <= 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["quantity"],
            message: "Quantity must be greater than 0 for stock_in or stock_out",
        });
    }
    if (data.type === "adjustment" && data.quantity < 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["quantity"],
            message: "Quantity cannot be negative for adjustment",
        });
    }
});
