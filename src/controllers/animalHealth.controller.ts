import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import { Animal, sequelize } from "../models";
import { RANCH_ROLES } from "../constants/roles";
import z from "zod";
// import { RanchRole } from "../types";

type HealthEventRow = {
    id: string;
    status: string;
    notes: string | null;
    created_at: Date;
};

const addHealthSchema = z.object({
    status: z.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: z.string().max(500).optional().nullable(),
});

type InsertedHealthEventRow = {
    id: string;
    animal_id: string;
    status: string;
    notes: string | null;
    recorded_by: string;
    created_at: Date;
};

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

        // ✅ Role gate
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

        // ✅ Ensure animal belongs to ranch
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

        // ✅ INSERT + RETURNING (typed as SELECT)
        const recorderId = req.user!.id;

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
            }, healthStatus: event.status, // latest health
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


export async function listAnimalHealth(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        // Ensure animal belongs to this ranch (security)
        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
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
