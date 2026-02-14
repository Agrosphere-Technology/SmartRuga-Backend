// src/controllers/animalHealth.controller.ts
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import { Animal, sequelize } from "../models";
import { RANCH_ROLES } from "../constants/roles";
import { z } from "zod";

type InsertedHealthEventRow = {
    id: string;
    animal_id: string;
    status: "healthy" | "sick" | "recovering" | "quarantined";
    notes: string | null;
    recorded_by: string;
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

const addHealthSchema = z.object({
    status: z.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: z.string().max(500).optional().nullable(),
});

/**
 * POST /api/v1/ranches/:slug/animals/:animalId/health
 * Add a health event for an animal (owner/manager/vet only)
 */
export async function addAnimalHealthEvent(req: Request, res: Response) {
    try {
        const parsed = addHealthSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }

        const requesterRole = req.membership!.ranchRole;

        const canAddHealth =
            requesterRole === RANCH_ROLES.OWNER ||
            requesterRole === RANCH_ROLES.MANAGER ||
            requesterRole === RANCH_ROLES.VET;

        if (!canAddHealth) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can add health records",
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        // Ensure animal belongs to ranch
        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }

        const recorderId = req.user!.id;
        const { status, notes } = parsed.data;

        // INSERT + RETURNING (typed as SELECT due to Sequelize TS overloads)
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
            // convenience: latest health status
            healthStatus: event.status,
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

/**
 * GET /api/v1/ranches/:slug/animals/:animalId/health
 * List health history (owner/manager/vet only)
 */
export async function listAnimalHealthHistory(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;

        const canView =
            requesterRole === RANCH_ROLES.OWNER ||
            requesterRole === RANCH_ROLES.MANAGER ||
            requesterRole === RANCH_ROLES.VET;

        if (!canView) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view health history",
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        // Ensure animal belongs to ranch
        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }

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
      WHERE e.animal_id = $1
      ORDER BY e.created_at DESC
      `,
            {
                bind: [animalId],
                type: QueryTypes.SELECT,
            }
        );

        const currentHealthStatus = rows[0]?.status ?? "unknown";

        return res.status(StatusCodes.OK).json({
            animal: {
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            healthStatus: currentHealthStatus,
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
