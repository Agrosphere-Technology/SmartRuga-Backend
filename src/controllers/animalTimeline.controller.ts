import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import { Animal, sequelize } from "../models";

type TimelineRow = {
    type: "health" | "animal_update" | "movement" | "vaccination";
    id: string;
    status: string | null;
    notes: string | null;
    field: string | null;
    from_value: string | null;
    to_value: string | null;
    movement_type: string | null;
    from_location_name: string | null;
    to_location_name: string | null;
    vaccine_name: string | null;
    dose: string | null;
    administered_at: Date | null;
    next_due_at: Date | null;
    recorded_by: string | null;
    recorded_by_email: string | null;
    recorded_by_first_name: string | null;
    recorded_by_last_name: string | null;
    recorded_by_role: string | null;
    created_at: Date;
};

type AnimalSummaryRow = {
    animal_id: string;
    animal_public_id: string;
    tag_number: string | null;
    rfid_tag: string | null;
    sex: string | null;
    date_of_birth: Date | null;
    status: string | null;
    breed: string | null;

    current_location_id: string | null;
    current_location_name: string | null;

    current_health_status: string | null;
    last_health_event_at: Date | null;

    last_vaccination_id: string | null;
    last_vaccine_name: string | null;
    last_vaccine_dose: string | null;
    last_administered_at: Date | null;
    last_next_due_at: Date | null;

    next_vaccination_due: Date | null;

    movement_count: string;
    health_event_count: string;
    vaccination_count: string;
};

function calculateAge(dateOfBirth: Date | null) {
    if (!dateOfBirth) {
        return {
            months: null,
            years: null,
        };
    }

    const now = new Date();
    const dob = new Date(dateOfBirth);

    let months =
        (now.getFullYear() - dob.getFullYear()) * 12 +
        (now.getMonth() - dob.getMonth());

    if (now.getDate() < dob.getDate()) {
        months -= 1;
    }

    months = Math.max(0, months);

    return {
        months,
        years: Number((months / 12).toFixed(2)),
    };
}

export async function getAnimalTimeline(req: Request, res: Response) {
    try {
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
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const [countRows] = await sequelize.query<{ total: string }>(
            `
            SELECT COUNT(*)::text AS total
            FROM (
                SELECT id, created_at FROM animal_health_events WHERE animal_id = $1
                UNION ALL
                SELECT id, created_at FROM animal_activity_events WHERE animal_id = $1
                UNION ALL
                SELECT id, created_at FROM animal_movement_events WHERE animal_id = $1
                UNION ALL
                SELECT id, created_at FROM animal_vaccinations WHERE animal_id = $1
            ) x
            `,
            {
                bind: [animalId],
                type: QueryTypes.SELECT,
            }
        );

        const total = Number(countRows?.total ?? 0);
        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

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
                    NULL::text AS movement_type,
                    NULL::text AS from_location_name,
                    NULL::text AS to_location_name,
                    NULL::text AS vaccine_name,
                    NULL::text AS dose,
                    NULL::timestamp AS administered_at,
                    NULL::timestamp AS next_due_at,
                    e.recorded_by,
                    u.email AS recorded_by_email,
                    u.first_name AS recorded_by_first_name,
                    u.last_name AS recorded_by_last_name,
                    rm.role::text AS recorded_by_role,
                    e.created_at
                FROM animal_health_events e
                JOIN users u ON u.id = e.recorded_by
                LEFT JOIN ranch_members rm
                    ON rm.user_id = e.recorded_by
                   AND rm.ranch_id = $2
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
                    NULL::text AS movement_type,
                    NULL::text AS from_location_name,
                    NULL::text AS to_location_name,
                    NULL::text AS vaccine_name,
                    NULL::text AS dose,
                    NULL::timestamp AS administered_at,
                    NULL::timestamp AS next_due_at,
                    a.recorded_by,
                    u.email AS recorded_by_email,
                    u.first_name AS recorded_by_first_name,
                    u.last_name AS recorded_by_last_name,
                    rm.role::text AS recorded_by_role,
                    a.created_at
                FROM animal_activity_events a
                JOIN users u ON u.id = a.recorded_by
                LEFT JOIN ranch_members rm
                    ON rm.user_id = a.recorded_by
                   AND rm.ranch_id = $2
                WHERE a.animal_id = $1

                UNION ALL

                SELECT
                    'movement'::text AS type,
                    m.id,
                    NULL::text AS status,
                    m.notes,
                    NULL::text AS field,
                    NULL::text AS from_value,
                    NULL::text AS to_value,
                    m.movement_type::text AS movement_type,
                    fl.name AS from_location_name,
                    tl.name AS to_location_name,
                    NULL::text AS vaccine_name,
                    NULL::text AS dose,
                    NULL::timestamp AS administered_at,
                    NULL::timestamp AS next_due_at,
                    m.recorded_by,
                    u.email AS recorded_by_email,
                    u.first_name AS recorded_by_first_name,
                    u.last_name AS recorded_by_last_name,
                    rm.role::text AS recorded_by_role,
                    m.created_at
                FROM animal_movement_events m
                JOIN users u ON u.id = m.recorded_by
                LEFT JOIN ranch_members rm
                    ON rm.user_id = m.recorded_by
                   AND rm.ranch_id = $2
                LEFT JOIN ranch_locations fl ON fl.id = m.from_location_id
                LEFT JOIN ranch_locations tl ON tl.id = m.to_location_id
                WHERE m.animal_id = $1

                UNION ALL

                SELECT
                    'vaccination'::text AS type,
                    v.id,
                    NULL::text AS status,
                    v.notes,
                    NULL::text AS field,
                    NULL::text AS from_value,
                    NULL::text AS to_value,
                    NULL::text AS movement_type,
                    NULL::text AS from_location_name,
                    NULL::text AS to_location_name,
                    v.vaccine_name::text AS vaccine_name,
                    v.dose::text AS dose,
                    v.administered_at,
                    v.next_due_at,
                    v.administered_by AS recorded_by,
                    u.email AS recorded_by_email,
                    u.first_name AS recorded_by_first_name,
                    u.last_name AS recorded_by_last_name,
                    rm.role::text AS recorded_by_role,
                    v.created_at
                FROM animal_vaccinations v
                LEFT JOIN users u ON u.id = v.administered_by
                LEFT JOIN ranch_members rm
                    ON rm.user_id = v.administered_by
                   AND rm.ranch_id = $2
                WHERE v.animal_id = $1
            ) t
            ORDER BY created_at DESC, id DESC
            LIMIT $3 OFFSET $4
            `,
            {
                bind: [animalId, ranchId, limit, offset],
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
                totalPages,
            },
            timeline: rows.map((r) => ({
                type: r.type,
                id: r.id,
                createdAt: r.created_at,

                ...(r.type === "health"
                    ? {
                        status: r.status,
                        notes: r.notes,
                        recordedBy: r.recorded_by
                            ? {
                                id: r.recorded_by,
                                email: r.recorded_by_email,
                                firstName: r.recorded_by_first_name,
                                lastName: r.recorded_by_last_name,
                                role: r.recorded_by_role,
                            }
                            : null,
                    }
                    : r.type === "animal_update"
                        ? {
                            field: r.field,
                            from: r.from_value,
                            to: r.to_value,
                            notes: r.notes,
                            recordedBy: r.recorded_by
                                ? {
                                    id: r.recorded_by,
                                    email: r.recorded_by_email,
                                    firstName: r.recorded_by_first_name,
                                    lastName: r.recorded_by_last_name,
                                    role: r.recorded_by_role,
                                }
                                : null,
                        }
                        : r.type === "movement"
                            ? {
                                movementType: r.movement_type,
                                fromLocation: r.from_location_name,
                                toLocation: r.to_location_name,
                                notes: r.notes,
                                recordedBy: r.recorded_by
                                    ? {
                                        id: r.recorded_by,
                                        email: r.recorded_by_email,
                                        firstName: r.recorded_by_first_name,
                                        lastName: r.recorded_by_last_name,
                                        role: r.recorded_by_role,
                                    }
                                    : null,
                            }
                            : {
                                vaccineName: r.vaccine_name,
                                dose: r.dose,
                                administeredAt: r.administered_at,
                                nextDueAt: r.next_due_at,
                                notes: r.notes,
                                recordedBy: r.recorded_by
                                    ? {
                                        id: r.recorded_by,
                                        email: r.recorded_by_email,
                                        firstName: r.recorded_by_first_name,
                                        lastName: r.recorded_by_last_name,
                                        role: r.recorded_by_role,
                                    }
                                    : null,
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

export async function getAnimalSummary(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const rows = await sequelize.query<AnimalSummaryRow>(
            `
            SELECT
                a.id AS animal_id,
                a.public_id AS animal_public_id,
                a.tag_number,
                a.rfid_tag,
                a.sex,
                a.date_of_birth,
                a.status,
                a.breed,

                cl.id AS current_location_id,
                cl.name AS current_location_name,

                lhe.status::text AS current_health_status,
                lhe.created_at AS last_health_event_at,

                lv.id AS last_vaccination_id,
                lv.vaccine_name AS last_vaccine_name,
                lv.dose AS last_vaccine_dose,
                lv.administered_at AS last_administered_at,
                lv.next_due_at AS last_next_due_at,

                nv.next_vaccination_due,

                COALESCE(mc.movement_count, 0)::text AS movement_count,
                COALESCE(hc.health_event_count, 0)::text AS health_event_count,
                COALESCE(vc.vaccination_count, 0)::text AS vaccination_count

            FROM animals a

            LEFT JOIN LATERAL (
                SELECT m.to_location_id
                FROM animal_movement_events m
                WHERE m.animal_id = a.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) lm ON true

            LEFT JOIN ranch_locations cl
                ON cl.id = lm.to_location_id

            LEFT JOIN LATERAL (
                SELECT h.status, h.created_at
                FROM animal_health_events h
                WHERE h.animal_id = a.id
                ORDER BY h.created_at DESC, h.id DESC
                LIMIT 1
            ) lhe ON true

            LEFT JOIN LATERAL (
                SELECT
                    v.id,
                    v.vaccine_name,
                    v.dose,
                    v.administered_at,
                    v.next_due_at
                FROM animal_vaccinations v
                WHERE v.animal_id = a.id
                ORDER BY v.administered_at DESC NULLS LAST, v.created_at DESC, v.id DESC
                LIMIT 1
            ) lv ON true

            LEFT JOIN LATERAL (
                SELECT MIN(v.next_due_at) AS next_vaccination_due
                FROM animal_vaccinations v
                WHERE v.animal_id = a.id
                  AND v.next_due_at IS NOT NULL
                  AND v.next_due_at >= NOW()
            ) nv ON true

            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS movement_count
                FROM animal_movement_events m
                WHERE m.animal_id = a.id
            ) mc ON true

            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS health_event_count
                FROM animal_health_events h
                WHERE h.animal_id = a.id
            ) hc ON true

            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS vaccination_count
                FROM animal_vaccinations v
                WHERE v.animal_id = a.id
            ) vc ON true

            WHERE a.id = $1
              AND a.ranch_id = $2
            LIMIT 1
            `,
            {
                bind: [animalId, ranchId],
                type: QueryTypes.SELECT,
            }
        );

        const row = rows[0];

        if (!row) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const age = calculateAge(row.date_of_birth);

        return res.status(StatusCodes.OK).json({
            animal: {
                id: row.animal_id,
                publicId: row.animal_public_id,
                tagNumber: row.tag_number,
                rfidTag: row.rfid_tag,
                sex: row.sex,
                dateOfBirth: row.date_of_birth,
                status: row.status,
                breed: row.breed,
            },
            currentLocation: row.current_location_id
                ? {
                    id: row.current_location_id,
                    name: row.current_location_name,
                }
                : null,
            health: {
                currentStatus: row.current_health_status,
                lastHealthEventAt: row.last_health_event_at,
            },
            vaccination: {
                lastVaccination: row.last_vaccination_id
                    ? {
                        id: row.last_vaccination_id,
                        vaccineName: row.last_vaccine_name,
                        dose: row.last_vaccine_dose,
                        administeredAt: row.last_administered_at,
                        nextDueAt: row.last_next_due_at,
                    }
                    : null,
                nextVaccinationDue: row.next_vaccination_due,
            },
            stats: {
                ageInMonths: age.months,
                ageInYears: age.years,
                movementCount: Number(row.movement_count ?? 0),
                healthEventCount: Number(row.health_event_count ?? 0),
                vaccinationCount: Number(row.vaccination_count ?? 0),
            },
        });
    } catch (err: any) {
        console.error("GET_ANIMAL_SUMMARY_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch animal summary",
            error: err?.message ?? "Unknown error",
        });
    }
}