import { z } from "zod";

export const createTaskSubmissionSchema = z
    .object({
        proofType: z.enum(["image", "scan"]).optional(),
        proofUrl: z.string().url().optional().nullable(),
        notes: z.string().trim().max(3000).optional().nullable(),
    })
    .superRefine((data, ctx) => {
        if (data.proofType === "scan" && !data.proofUrl) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["proofUrl"],
                message: "proofUrl is required when proofType is scan",
            });
        }
    });

export const reviewTaskSubmissionSchema = z.object({
    status: z.enum(["approved", "rejected"]),
    reviewNotes: z.string().trim().max(3000).optional().nullable(),
});