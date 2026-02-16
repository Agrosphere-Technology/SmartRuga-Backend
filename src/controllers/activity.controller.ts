import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import { Animal, sequelize } from "../models";
import { RANCH_ROLES } from "../constants/roles";
import z from "zod";

function canViewActivity(role: string) {
    // keep it strict (best for now)
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

function parseIntSafe(val: any, def: number) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

type ActivityRow = {
    id: string;
    ranch_id: string;
    animal_id: string | null;
    event_type: string;
    field: string | null;
    from_value: string | null;
    to_value: string | null;
    notes: string | null;
    recorded_by: string;
    created_at: Date;

    actor_email: string;
    actor_first_name: string | null;
    actor_last_name: string | null;

    animal_public_id: string | null;
    animal_tag_number: string | null;
};

export async function listRanchActivity(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canViewActivity(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view ranch activity",
            });
        }

        const ranchId = req.ranch!.id;

        const page = parseIntSafe(req.query.page, 1);
        const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
        const offset = (page - 1) * limit;

        const eventType =
            typeof req.query.eventType === "string" ? req.query.eventType : undefined;

        const animalId =
            typeof req.query.animalId === "string" ? req.query.animalId : undefined;

        const userId =
            typeof req.query.userId === "string" ? req.query.userId : undefined;

        const from = typeof req.query.from === "string" ? req.query.from : undefined;
        const to = typeof req.query.to === "string" ? req.query.to : undefined;

        const whereParts: string[] = [`e.ranch_id = $1`];
        const bind: any[] = [ranchId];
        let idx = 2;

        if (eventType) {
            whereParts.push(`e.event_type = $${idx++}`);
            bind.push(eventType);
        }

        if (animalId) {
            whereParts.push(`e.animal_id = $${idx++}::uuid`);
            bind.push(animalId);
        }

        if (userId) {
            whereParts.push(`e.recorded_by = $${idx++}::uuid`);
            bind.push(userId);
        }

        if (from) {
            whereParts.push(`e.created_at >= $${idx++}::timestamptz`);
            bind.push(from);
        }

        if (to) {
            whereParts.push(`e.created_at <= $${idx++}::timestamptz`);
            bind.push(to);
        }

        const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

        const countRows = await sequelize.query<{ total: number }>(
            `
      SELECT COUNT(*)::int AS total
      FROM animal_activity_events e
      ${whereSql}
      `,
            { bind, type: QueryTypes.SELECT }
        );

        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const rows = await sequelize.query<ActivityRow>(
            `
      SELECT
        e.id,
        e.ranch_id,
        e.animal_id,
        e.event_type,
        e.field,
        e.from_value,
        e.to_value,
        e.notes,
        e.recorded_by,
        e.created_at,

        u.email AS actor_email,
        u.first_name AS actor_first_name,
        u.last_name AS actor_last_name,

        a.public_id AS animal_public_id,
        a.tag_number AS animal_tag_number

      FROM animal_activity_events e
      JOIN users u ON u.id = e.recorded_by
      LEFT JOIN animals a ON a.id = e.animal_id
      ${whereSql}
      ORDER BY e.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
      `,
            {
                bind: [...bind, limit, offset],
                type: QueryTypes.SELECT,
            }
        );

        return res.status(StatusCodes.OK).json({
            pagination: { page, limit, total, totalPages },
            events: rows.map((r) => ({
                id: r.id,
                eventType: r.event_type,
                field: r.field,
                fromValue: r.from_value,
                toValue: r.to_value,
                notes: r.notes,
                actor: {
                    id: r.recorded_by,
                    email: r.actor_email,
                    firstName: r.actor_first_name,
                    lastName: r.actor_last_name,
                },
                animal: r.animal_id
                    ? {
                        id: r.animal_id,
                        publicId: r.animal_public_id,
                        tagNumber: r.animal_tag_number,
                    }
                    : null,
                createdAt: r.created_at,
            })),
        });
    } catch (err: any) {
        console.error("LIST_RANCH_ACTIVITY_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list ranch activity",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function listAnimalActivity(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canViewActivity(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view animal activity",
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;
        const uuid = z.string().uuid();

        // ensure animal belongs to ranch
        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
        }


        if (animalId && !uuid.safeParse(animalId).success) {
            return res.status(400).json({ message: "animalId must be uuid" });
        }

        const page = parseIntSafe(req.query.page, 1);
        const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
        const offset = (page - 1) * limit;

        const countRows = await sequelize.query<{ total: number }>(
            `
      SELECT COUNT(*)::int AS total
      FROM animal_activity_events e
      WHERE e.ranch_id = $1 AND e.animal_id = $2::uuid
      `,
            { bind: [ranchId, animalId], type: QueryTypes.SELECT }
        );

        const total = countRows[0]?.total ?? 0;
        // const totalPages = Math.max(1, Math.ceil(total / limit));
        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        const rows = await sequelize.query<ActivityRow>(
            `
      SELECT
        e.id,
        e.ranch_id,
        e.animal_id,
        e.event_type,
        e.field,
        e.from_value,
        e.to_value,
        e.notes,
        e.recorded_by,
        e.created_at,

        u.email AS actor_email,
        u.first_name AS actor_first_name,
        u.last_name AS actor_last_name,

        a.public_id AS animal_public_id,
        a.tag_number AS animal_tag_number

      FROM animal_activity_events e
      JOIN users u ON u.id = e.recorded_by
      LEFT JOIN animals a ON a.id = e.animal_id
      WHERE e.ranch_id = $1 AND e.animal_id = $2::uuid
      ORDER BY e.created_at DESC
      LIMIT $3 OFFSET $4
      `,
            {
                bind: [ranchId, animalId, limit, offset],
                type: QueryTypes.SELECT,
            }
        );

        return res.status(StatusCodes.OK).json({
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            pagination: { page, limit, total, totalPages },
            events: rows.map((r) => ({
                id: r.id,
                eventType: r.event_type,
                field: r.field,
                fromValue: r.from_value,
                toValue: r.to_value,
                notes: r.notes,
                actor: {
                    id: r.recorded_by,
                    email: r.actor_email,
                    firstName: r.actor_first_name,
                    lastName: r.actor_last_name,
                },
                createdAt: r.created_at,
            })),
        });
    } catch (err: any) {
        console.error("LIST_ANIMAL_ACTIVITY_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list animal activity",
            error: err?.message ?? "Unknown error",
        });
    }
}