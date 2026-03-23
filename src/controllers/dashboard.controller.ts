import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes, Op } from "sequelize";
import { Vaccination, sequelize } from "../models";

type AnimalStatsRow = {
    total: string;
    active: string;
    sold: string;
    deceased: string;
    sick: string;
};

type RecentActivityRow = {
    type: "health" | "animal_update" | "movement" | "vaccination";
    id: string;
    created_at: Date;
    animal_public_id: string;
    animal_tag_number: string | null;
    status: string | null;
    field: string | null;
    from_value: string | null;
    to_value: string | null;
    movement_type: string | null;
    vaccine_name: string | null;
};

function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export async function getRanchDashboard(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const ranchRole = req.membership?.ranchRole ?? null;
        const dueSoonDays = 7;

        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const dueSoonEnd = endOfDay(addDays(now, dueSoonDays));

        const [animalStats] = await sequelize.query<AnimalStatsRow>(
            `
            SELECT
                COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE a.status = 'active')::text AS active,
                COUNT(*) FILTER (WHERE a.status = 'sold')::text AS sold,
                COUNT(*) FILTER (WHERE a.status = 'deceased')::text AS deceased,
                COUNT(*) FILTER (WHERE lhe.status = 'sick')::text AS sick
            FROM animals a
            LEFT JOIN LATERAL (
                SELECT h.status
                FROM animal_health_events h
                WHERE h.animal_id = a.id
                ORDER BY h.created_at DESC, h.id DESC
                LIMIT 1
            ) lhe ON true
            WHERE a.ranch_id = $1
            `,
            {
                bind: [ranchId],
                type: QueryTypes.SELECT,
            }
        );

        const vaccinationRows = await Vaccination.findAll({
            where: {
                ranch_id: ranchId,
                deleted_at: null,
                next_due_at: {
                    [Op.ne]: null,
                    [Op.lte]: dueSoonEnd,
                },
            },
            attributes: ["next_due_at"],
            raw: true,
        } as any);

        let overdue = 0;
        let dueToday = 0;
        let dueSoon = 0;

        for (const row of vaccinationRows as any[]) {
            const nextDueAt = row.next_due_at ? new Date(row.next_due_at) : null;
            if (!nextDueAt) continue;

            if (nextDueAt < todayStart) {
                overdue += 1;
            } else if (nextDueAt >= todayStart && nextDueAt <= todayEnd) {
                dueToday += 1;
            } else if (nextDueAt > todayEnd && nextDueAt <= dueSoonEnd) {
                dueSoon += 1;
            }
        }

        const recentActivity = await sequelize.query<RecentActivityRow>(
            `
            SELECT *
            FROM (
                SELECT
                    'health'::text AS type,
                    e.id,
                    e.created_at,
                    a.public_id AS animal_public_id,
                    a.tag_number AS animal_tag_number,
                    e.status::text AS status,
                    NULL::text AS field,
                    NULL::text AS from_value,
                    NULL::text AS to_value,
                    NULL::text AS movement_type,
                    NULL::text AS vaccine_name
                FROM animal_health_events e
                JOIN animals a ON a.id = e.animal_id
                WHERE a.ranch_id = $1

                UNION ALL

                SELECT
                    'animal_update'::text AS type,
                    ev.id,
                    ev.created_at,
                    a.public_id AS animal_public_id,
                    a.tag_number AS animal_tag_number,
                    NULL::text AS status,
                    ev.field,
                    ev.from_value,
                    ev.to_value,
                    NULL::text AS movement_type,
                    NULL::text AS vaccine_name
                FROM animal_activity_events ev
                JOIN animals a ON a.id = ev.animal_id
                WHERE a.ranch_id = $1

                UNION ALL

                SELECT
                    'movement'::text AS type,
                    m.id,
                    m.created_at,
                    a.public_id AS animal_public_id,
                    a.tag_number AS animal_tag_number,
                    NULL::text AS status,
                    NULL::text AS field,
                    NULL::text AS from_value,
                    NULL::text AS to_value,
                    m.movement_type::text AS movement_type,
                    NULL::text AS vaccine_name
                FROM animal_movement_events m
                JOIN animals a ON a.id = m.animal_id
                WHERE a.ranch_id = $1

                UNION ALL

                SELECT
                    'vaccination'::text AS type,
                    v.id,
                    v.created_at,
                    a.public_id AS animal_public_id,
                    a.tag_number AS animal_tag_number,
                    NULL::text AS status,
                    NULL::text AS field,
                    NULL::text AS from_value,
                    NULL::text AS to_value,
                    NULL::text AS movement_type,
                    v.vaccine_name::text AS vaccine_name
                FROM animal_vaccinations v
                JOIN animals a ON a.id = v.animal_id
                WHERE a.ranch_id = $1
                  AND v.deleted_at IS NULL
            ) t
            ORDER BY created_at DESC, id DESC
            LIMIT 10
            `,
            {
                bind: [ranchId],
                type: QueryTypes.SELECT,
            }
        );

        return res.status(StatusCodes.OK).json({
            role: ranchRole,
            animals: {
                total: Number(animalStats?.total ?? 0),
                active: Number(animalStats?.active ?? 0),
                sold: Number(animalStats?.sold ?? 0),
                deceased: Number(animalStats?.deceased ?? 0),
                sick: Number(animalStats?.sick ?? 0),
            },
            vaccinationAlerts: {
                overdue,
                dueToday,
                dueSoon,
                dueSoonWindowDays: dueSoonDays,
            },
            recentActivity: recentActivity.map((item) => {
                let title = "Activity recorded";
                let description = `Activity recorded for animal ${item.animal_tag_number ?? item.animal_public_id}`;

                if (item.type === "health") {
                    title = "Health status updated";
                    description = `Animal ${item.animal_tag_number ?? item.animal_public_id} marked as ${item.status}`;
                } else if (item.type === "animal_update") {
                    title = "Animal record updated";
                    description = `${item.field} changed from ${item.from_value ?? "-"} to ${item.to_value ?? "-"}`;
                } else if (item.type === "movement") {
                    title = "Animal moved";
                    description = `Movement type: ${item.movement_type}`;
                } else if (item.type === "vaccination") {
                    title = "Vaccination recorded";
                    description = `${item.vaccine_name} recorded for animal ${item.animal_tag_number ?? item.animal_public_id}`;
                }

                return {
                    type: item.type,
                    id: item.id,
                    createdAt: item.created_at,
                    animalPublicId: item.animal_public_id,
                    animalTagNumber: item.animal_tag_number,
                    title,
                    description,
                };
            }),
        });
    } catch (err: any) {
        console.error("GET_RANCH_DASHBOARD_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch ranch dashboard",
            error: err?.message ?? "Unknown error",
        });
    }
}


