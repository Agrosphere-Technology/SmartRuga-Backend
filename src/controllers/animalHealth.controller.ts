import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import z from "zod";

import { Animal, sequelize } from "../models";
import { RANCH_ROLES } from "../constants/roles";

type InsertedHealthEventRow = {
    id: string;
    animal_id: string;
    status: "healthy" | "sick" | "recovering" | "quarantined";
    notes: string | null;
    recorded_by: string;
    created_at: Date;
};

type HealthEventRow = {
    id: string;
    status: "healthy" | "sick" | "recovering" | "quarantined";
    notes: string | null;
    created_at: Date;
};

type HealthHistoryRow = {
    id: string;
    animal_id: string;
    status: "healthy" | "sick" | "recovering" | "quarantined";
    notes: string | null;
    recorded_by: string;
    recorded_by_email: string;
    recorded_by_first_name: string | null;
    recorded_by_last_name: string | null;
    created_at: Date;
};

const historyQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 1))
        .refine((n) => Number.isFinite(n) && n >= 1, "page must be >= 1"),
    limit: z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 20))
        .refine((n) => Number.isFinite(n) && n >= 1 && n <= 100, "limit must be 1..100"),
    status: z.enum(["healthy", "sick", "recovering", "quarantined"]).optional(),
    from: z.string().optional(), // YYYY-MM-DD
    to: z.string().optional(),   // YYYY-MM-DD
});

function canViewHealth(role: string) {
    // I might decide to loosen this later if we decide / want all active members to view
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

function parseDateOnlyToUTCStart(dateStr: string) {
    // "2026-02-14" -> 2026-02-14T00:00:00.000Z
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateOnlyToUTCEndExclusive(dateStr: string) {
    // inclusive end date -> exclusive next day start
    const start = parseDateOnlyToUTCStart(dateStr);
    if (!start) return null;
    const next = new Date(start);
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
}

type CountRow = { count: string };

const addHealthSchema = z.object({
    status: z.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: z.string().max(500).optional().nullable(),
});



function canAddHealth(role: string) {
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}


// POST /api/v1/ranches/:slug/animals/:animalId/health
export async function addAnimalHealthEvent(req: Request, res: Response) {
    try {
        const parsed = addHealthSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const requesterRole = req.membership!.ranchRole;
        if (!canAddHealth(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can add health records",
            });
        }

        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }

        const { status, notes } = parsed.data;
        const recorderId = req.user!.id;

        // INSERT + RETURNING (use QueryTypes.SELECT in Sequelize typings)
        const rows = await sequelize.query<InsertedHealthEventRow>(
            `
      INSERT INTO animal_health_events (id, animal_id, status, notes, recorded_by, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      RETURNING id, animal_id, status, notes, recorded_by, created_at
      `,
            {
                bind: [animalId, status, notes ?? null, recorderId],
                type: QueryTypes.SELECT,
            }
        );

        const event = rows[0];

        return res.status(StatusCodes.CREATED).json({
            message: "Health event recorded",
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            healthEvent: {
                id: event.id,
                status: event.status,
                notes: event.notes,
                recordedBy: event.recorded_by,
                createdAt: event.created_at,
            },
            healthStatus: event.status, // latest health
        });
    } catch (err: any) {
        console.error("ADD_ANIMAL_HEALTH_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to add animal health event",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}

// GET /api/v1/ranches/:slug/animals/:animalId/health
// (simple list: status+notes+createdAt)
export async function listAnimalHealth(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id"],
        } as any);

        if (!animal) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }

        const rows = await sequelize.query<HealthEventRow>(
            `
      SELECT id, status, notes, created_at
      FROM animal_health_events
      WHERE animal_id = $1
      ORDER BY created_at DESC
      `,
            {
                bind: [animalId],
                type: QueryTypes.SELECT,
            }
        );

        return res.status(StatusCodes.OK).json({
            healthEvents: rows.map((r) => ({
                id: r.id,
                status: r.status,
                notes: r.notes,
                createdAt: r.created_at,
            })),
        });
    } catch (err: any) {
        console.error("LIST_ANIMAL_HEALTH_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list animal health history",
            error: err?.message ?? "Unknown error",
        });
    }
}

// GET /api/v1/ranches/:slug/animals/:animalId/health/latest
export async function getAnimalLatestHealth(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canViewHealth(requesterRole)) {
            return res
                .status(StatusCodes.FORBIDDEN)
                .json({ message: "Only owner/manager/vet can view health" });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }

        const rows = await sequelize.query<HealthEventRow>(
            `
                SELECT id, status, notes, created_at
                FROM animal_health_events
                WHERE animal_id = $1
                ORDER BY created_at DESC
                LIMIT 1
            `,
            { bind: [animalId], type: QueryTypes.SELECT }
        );

        const latest = rows[0] ?? null;

        return res.status(StatusCodes.OK).json({
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            latest: latest
                ? {
                    id: latest.id,
                    status: latest.status,
                    notes: latest.notes,
                    createdAt: latest.created_at,
                }
                : null,
            healthStatus: latest?.status ?? "healthy",
        });
    } catch (err: any) {
        console.error("GET_LATEST_HEALTH_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch latest health",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}

// GET /api/v1/ranches/:slug/animals/:animalId/health/history?page=&limit=&status=&from=&to=

// GET /api/v1/ranches/:slug/animals/:animalId/health/history
export async function listAnimalHealthHistory(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canViewHealth(requesterRole)) {
            return res
                .status(StatusCodes.FORBIDDEN)
                .json({ message: "Only owner/manager/vet can view health history" });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        // validate query
        const parsedQ = historyQuerySchema.safeParse(req.query);
        if (!parsedQ.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid query params",
                issues: parsedQ.error.issues,
            });
        }

        const { page, limit, status, from, to } = parsedQ.data;
        const offset = (page - 1) * limit;

        // Ensure animal belongs to this ranch
        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }

        // Build WHERE dynamically + bind array
        const whereParts: string[] = [`e.animal_id = $1`];
        const bind: any[] = [animalId];

        if (status) {
            bind.push(status);
            whereParts.push(`e.status = $${bind.length}`);
        }

        if (from) {
            const fromDate = parseDateOnlyToUTCStart(from);
            if (!fromDate) {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ message: "from must be YYYY-MM-DD" });
            }
            bind.push(fromDate);
            whereParts.push(`e.created_at >= $${bind.length}`);
        }

        if (to) {
            const toDateExclusive = parseDateOnlyToUTCEndExclusive(to);
            if (!toDateExclusive) {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ message: "to must be YYYY-MM-DD" });
            }
            bind.push(toDateExclusive);
            whereParts.push(`e.created_at < $${bind.length}`);
        }

        const whereSql = whereParts.join(" AND ");

        // total count
        const countRows = await sequelize.query<{ total: number }>(
            `
        SELECT COUNT(*)::int AS total
        FROM animal_health_events e
        WHERE ${whereSql}
      `,
            { bind, type: QueryTypes.SELECT }
        );

        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        // page data
        bind.push(limit);
        const limitPos = bind.length;
        bind.push(offset);
        const offsetPos = bind.length;

        const rows = await sequelize.query<HealthHistoryRow>(
            `
        SELECT
          e.id,
          e.animal_id,
          e.status,
          e.notes,
          e.recorded_by,
          u.email AS recorded_by_email,
          u.first_name AS recorded_by_first_name,
          u.last_name AS recorded_by_last_name,
          e.created_at
        FROM animal_health_events e
        JOIN users u ON u.id = e.recorded_by
        WHERE ${whereSql}
        ORDER BY e.created_at DESC
        LIMIT $${limitPos}
        OFFSET $${offsetPos}
      `,
            { bind, type: QueryTypes.SELECT }
        );

        return res.status(StatusCodes.OK).json({
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            filters: {
                status: status ?? null,
                from: from ?? null,
                to: to ?? null,
            },
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
            events: rows.map((r) => ({
                id: r.id,
                status: r.status,
                notes: r.notes,
                recordedBy: {
                    id: r.recorded_by,
                    email: r.recorded_by_email,
                    firstName: r.recorded_by_first_name,
                    lastName: r.recorded_by_last_name,
                },
                createdAt: r.created_at,
            })),
        });
    } catch (err: any) {
        console.error("LIST_ANIMAL_HEALTH_HISTORY_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list animal health history",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}