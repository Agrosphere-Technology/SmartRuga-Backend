"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewTaskSubmissionSchema = exports.createTaskSubmissionSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSubmissionSchema = zod_1.z
    .object({
    proofType: zod_1.z.enum(["image", "scan"]).optional(),
    proofUrl: zod_1.z.string().url().optional().nullable(),
    notes: zod_1.z.string().trim().max(3000).optional().nullable(),
})
    .superRefine((data, ctx) => {
    if (data.proofType === "scan" && !data.proofUrl) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["proofUrl"],
            message: "proofUrl is required when proofType is scan",
        });
    }
});
exports.reviewTaskSubmissionSchema = zod_1.z.object({
    status: zod_1.z.enum(["approved", "rejected"]),
    reviewNotes: zod_1.z.string().trim().max(3000).optional().nullable(),
});
