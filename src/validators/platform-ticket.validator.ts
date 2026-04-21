import { z } from "zod";

export const createPlatformTicketSchema = z.object({
    title: z.string().trim().min(3).max(255),
    description: z.string().trim().min(10).max(5000),
    category: z.enum([
        "support",
        "billing",
        "technical_issue",
        "account_access",
        "feature_request",
        "data_issue",
        "other",
    ]),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const updatePlatformTicketSchema = z.object({
    status: z.enum(["open", "in_review", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    assignedToUserId: z.string().uuid().nullable().optional(),
});

export const listPlatformTicketsQuerySchema = z.object({
    status: z.enum(["open", "in_review", "resolved", "closed"]).optional(),
    category: z
        .enum([
            "support",
            "billing",
            "technical_issue",
            "account_access",
            "feature_request",
            "data_issue",
            "other",
        ])
        .optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});