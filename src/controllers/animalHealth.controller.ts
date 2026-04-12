import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes, Transaction } from "sequelize";
import z from "zod";
import { createRanchAlert } from "../services/ranchAlert.service";
import { Animal, sequelize } from "../models";
import { RANCH_ROLES } from "../constants/roles";

type InsertedHealthEventRow = {
    id: string;
    public_id: string;
    animal_id: string;
    status: "healthy" | "sick" | "recovering" | "quarantined";
    notes: string | null;
    recorded_by: string;
    created_at: Date;
};

type HealthEventRow = {
    id: string;
    public_id?: string;
    status: "healthy" | "sick" | "recovering" | "quarantined";
    notes: string | null;
    created_at: Date;
};

type HealthHistoryRow = {
    id: string;
    public_id?: string;
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
    from: z.string().optional(),
    to: z.string().optional(),
});

const addHealthSchema = z.object({
    status: z.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: z.string().max(500).optional().nullable(),
});

function canViewHealth(role: string) {
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

function canAddHealth(role: string) {
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

function parseDateOnlyToUTCStart(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateOnlyToUTCEndExclusive(dateStr: string) {
    const start = parseDateOnlyToUTCStart(dateStr);
    if (!start) return null;

    const next = new Date(start);
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
}

// POST /api/v1/ranches/:slug/animals/:animalId/health
export async function addAnimalHealthEvent(req: Request, res: Response) {
    let t: Transaction | null = null;

    try {
        const parsed = addHealthSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }

        const ranchId = req.ranch!.id;
        const animalIdParam = String(req.params.animalId);
        const requesterRole = req.membership!.ranchRole;

        if (!canAddHealth(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can add health records",
            });
        }

        const animal = await Animal.findOne({
            where: { id: animalIdParam, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const internalAnimalId = String(animal.get("id"));
        const animalPublicId = String(animal.get("public_id"));
        const animalTagNumber = animal.get("tag_number") as string | null;

        const { status, notes } = parsed.data;
        const recorderId = req.user!.id;

        t = await sequelize.transaction();

        const rows = await sequelize.query<InsertedHealthEventRow>(
            `
      INSERT INTO animal_health_events (
        id,
        public_id,
        animal_id,
        status,
        notes,
        recorded_by,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        NOW()
      )
      RETURNING id, public_id, animal_id, status, notes, recorded_by, created_at
      `,
            {
                bind: [internalAnimalId, status, notes ?? null, recorderId],
                type: QueryTypes.SELECT,
                transaction: t,
            }
        );

        const event = rows[0];

        if (event.status === "sick" || event.status === "quarantined") {
            const alertType =
                event.status === "sick" ? "health_sick" : "health_quarantined";

            const tag = animalTagNumber ?? "UN-TAGGED";
            const msg = `Animal ${tag} marked ${event.status}.${event.notes ? ` ${event.notes}` : ""}`.trim();

            await createRanchAlert({
                ranchId,
                animalId: internalAnimalId,
                alertType,
                title:
                    event.status === "sick"
                        ? "Animal health alert"
                        : "Animal quarantine alert",
                message: msg,
                priority: "high",
                entityType: "animal",
                entityPublicId: animalPublicId,
                transaction: t,
                dedupe: true,
                dedupeMinutes: 60,
            });
        }

        await t.commit();

        return res.status(StatusCodes.CREATED).json({
            message: "Health event recorded",
            animal: {
                id: internalAnimalId,
                publicId: animalPublicId,
                tagNumber: animalTagNumber,
            },
            healthEvent: {
                id: event.id,
                publicId: event.public_id,
                status: event.status,
                notes: event.notes,
                recordedBy: event.recorded_by,
                createdAt: event.created_at,
            },
            healthStatus: event.status,
        });
    } catch (err: any) {
        if (t) {
            await t.rollback();
        }

        console.error("ADD_ANIMAL_HEALTH_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to add animal health event",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}

// GET /api/v1/ranches/:slug/animals/:animalId/health
export async function listAnimalHealth(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;

        if (!canViewHealth(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view health history",
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id"],
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const internalAnimalId = String(animal.get("id"));

        const rows = await sequelize.query<HealthEventRow>(
            `
      SELECT id, public_id, status, notes, created_at
      FROM animal_health_events
      WHERE animal_id = $1
      ORDER BY created_at DESC
      `,
            {
                bind: [internalAnimalId],
                type: QueryTypes.SELECT,
            }
        );

        return res.status(StatusCodes.OK).json({
            healthEvents: rows.map((r) => ({
                id: r.id,
                publicId: r.public_id,
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
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view health",
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const internalAnimalId = String(animal.get("id"));

        const rows = await sequelize.query<HealthEventRow>(
            `
      SELECT id, public_id, status, notes, created_at
      FROM animal_health_events
      WHERE animal_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
            {
                bind: [internalAnimalId],
                type: QueryTypes.SELECT,
            }
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
                    publicId: latest.public_id,
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

// GET /api/v1/ranches/:slug/animals/:animalId/health/history
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

        const parsedQ = historyQuerySchema.safeParse(req.query);
        if (!parsedQ.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid query params",
                issues: parsedQ.error.issues,
            });
        }

        const { page, limit, status, from, to } = parsedQ.data;
        const offset = (page - 1) * limit;

        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const internalAnimalId = String(animal.get("id"));

        const whereParts: string[] = [`e.animal_id = $1`];
        const bind: any[] = [internalAnimalId];

        if (status) {
            bind.push(status);
            whereParts.push(`e.status = $${bind.length}`);
        }

        if (from) {
            const fromDate = parseDateOnlyToUTCStart(from);
            if (!fromDate) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: "from must be YYYY-MM-DD",
                });
            }

            bind.push(fromDate);
            whereParts.push(`e.created_at >= $${bind.length}`);
        }

        if (to) {
            const toDateExclusive = parseDateOnlyToUTCEndExclusive(to);
            if (!toDateExclusive) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: "to must be YYYY-MM-DD",
                });
            }

            bind.push(toDateExclusive);
            whereParts.push(`e.created_at < $${bind.length}`);
        }

        const whereSql = whereParts.join(" AND ");

        const countRows = await sequelize.query<{ total: number }>(
            `
      SELECT COUNT(*)::int AS total
      FROM animal_health_events e
      WHERE ${whereSql}
      `,
            {
                bind,
                type: QueryTypes.SELECT,
            }
        );

        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const dataBind = [...bind, limit, offset];
        const limitPos = dataBind.length - 1;
        const offsetPos = dataBind.length;

        const rows = await sequelize.query<HealthHistoryRow>(
            `
      SELECT
        e.id,
        e.public_id,
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
                publicId: r.public_id,
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