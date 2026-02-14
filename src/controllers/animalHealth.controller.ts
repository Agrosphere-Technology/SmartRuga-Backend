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

type CountRow = { count: string };

const addHealthSchema = z.object({
    status: z.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: z.string().max(500).optional().nullable(),
});

const historyQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(["healthy", "sick", "recovering", "quarantined"]).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
});

function canAddHealth(role: string) {
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

function canViewHealth(role: string) {
    // you can loosen this later if you want all active members to view
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
export async function listAnimalHealthHistory(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canViewHealth(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view health history",
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const qp = historyQuerySchema.safeParse(req.query);
        if (!qp.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid query params",
                issues: qp.error.issues,
            });
        }

        const { page, limit, status, from, to } = qp.data;
        const offset = (page - 1) * limit;

        // ensure animal belongs to ranch
        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }

        // dynamic WHERE
        const whereParts: string[] = ["e.animal_id = $1"];
        const bind: any[] = [animalId];
        let i = 2;

        if (status) {
            whereParts.push(`e.status = $${i}`);
            bind.push(status);
            i++;
        }
        if (from) {
            whereParts.push(`e.created_at >= $${i}`);
            bind.push(new Date(from));
            i++;
        }
        if (to) {
            whereParts.push(`e.created_at <= $${i}`);
            bind.push(new Date(to));
            i++;
        }

        const whereSql = whereParts.join(" AND ");

        // total count
        const countRows = await sequelize.query<CountRow>(
            `
      SELECT COUNT(*)::text as count
      FROM animal_health_events e
      WHERE ${whereSql}
      `,
            { bind, type: QueryTypes.SELECT }
        );

        const total = Number(countRows[0]?.count ?? "0");

        // data rows
        const dataBind = [...bind, limit, offset];
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
      LIMIT $${i} OFFSET $${i + 1}
      `,
            {
                bind: dataBind,
                type: QueryTypes.SELECT,
            }
        );

        return res.status(StatusCodes.OK).json({
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
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
