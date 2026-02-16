import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import { Animal, sequelize } from "../models";
import { RANCH_ROLES } from "../constants/roles";

type TimelineRow = {
    type: "health" | "animal_update";
    id: string;
    status: string | null;
    notes: string | null;
    field: string | null;
    from_value: string | null;
    to_value: string | null;
    recorded_by: string | null;
    recorded_by_email: string | null;
    recorded_by_first_name: string | null;
    recorded_by_last_name: string | null;
    created_at: Date;
};

const canView = (role: string) =>
    role === RANCH_ROLES.OWNER || role === RANCH_ROLES.MANAGER || role === RANCH_ROLES.VET;

export async function getAnimalTimeline(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canView(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view timeline",
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
        const offset = (page - 1) * limit;

        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
        }

        const [countRows] = await sequelize.query<{ total: string }>(
            `
      SELECT COUNT(*)::text AS total FROM (
        SELECT id, created_at FROM animal_health_events WHERE animal_id = $1
        UNION ALL
        SELECT id, created_at FROM animal_activity_events WHERE animal_id = $1
      ) x
      `,
            { bind: [animalId], type: QueryTypes.SELECT }
        );

        const total = Number(countRows?.total ?? 0);
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const rows = await sequelize.query<TimelineRow>(
            `
      SELECT *
      FROM (
        SELECT
          'health'::text AS type,
          e.id,
          e.status::text AS status,
          e.notes,
          NULL::text AS field,
          NULL::text AS from_value,
          NULL::text AS to_value,
          e.recorded_by,
          u.email AS recorded_by_email,
          u.first_name AS recorded_by_first_name,
          u.last_name AS recorded_by_last_name,
          e.created_at
        FROM animal_health_events e
        JOIN users u ON u.id = e.recorded_by
        WHERE e.animal_id = $1

        UNION ALL

        SELECT
          'animal_update'::text AS type,
          a.id,
          NULL::text AS status,
          a.notes,
          a.field,
          a.from_value,
          a.to_value,
          a.recorded_by,
          u.email AS recorded_by_email,
          u.first_name AS recorded_by_first_name,
          u.last_name AS recorded_by_last_name,
          a.created_at
        FROM animal_activity_events a
        JOIN users u ON u.id = a.recorded_by
        WHERE a.animal_id = $1
      ) t
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
            { bind: [animalId, limit, offset], type: QueryTypes.SELECT }
        );

        return res.status(StatusCodes.OK).json({
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            pagination: { page, limit, total, totalPages },
            timeline: rows.map((r) => ({
                type: r.type,
                id: r.id,
                createdAt: r.created_at,
                ...(r.type === "health"
                    ? {
                        status: r.status,
                        notes: r.notes,
                        recordedBy: {
                            id: r.recorded_by,
                            email: r.recorded_by_email,
                            firstName: r.recorded_by_first_name,
                            lastName: r.recorded_by_last_name,
                        },
                    }
                    : {
                        field: r.field,
                        from: r.from_value,
                        to: r.to_value,
                        notes: r.notes,
                        recordedBy: {
                            id: r.recorded_by,
                            email: r.recorded_by_email,
                            firstName: r.recorded_by_first_name,
                            lastName: r.recorded_by_last_name,
                        },
                    }),
            })),
        });
    } catch (err: any) {
        console.error("GET_ANIMAL_TIMELINE_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch animal timeline",
            error: err?.message ?? "Unknown error",
        });
    }
}
