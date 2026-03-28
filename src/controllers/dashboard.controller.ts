import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes, Op } from "sequelize";
import { Vaccination, sequelize } from "../models";
import {
    addDays,
    AnimalStatsRow,
    buildDashboardActivity,
    endOfDay,
    RecentActivityRow,
    startOfDay,
    SubmissionApprovalStatsRow,
    TaskStatsRow,
} from "../helpers/dashboard.helpers";

export async function getRanchDashboard(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const ranchRole = req.membership?.ranchRole ?? null;
        const canManage = ["owner", "manager"].includes(ranchRole ?? "");

        const parsedDueSoonDays = Number(req.query.dueSoonDays);
        const dueSoonDays =
            Number.isFinite(parsedDueSoonDays) && parsedDueSoonDays > 0
                ? parsedDueSoonDays
                : 7;

        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const dueSoonEnd = endOfDay(addDays(now, dueSoonDays));

        const animalStatsPromise = sequelize.query<AnimalStatsRow>(
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

        const vaccinationRowsPromise = Vaccination.findAll({
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

        const taskStatsPromise = canManage
            ? sequelize.query<TaskStatsRow>(
                `
                SELECT
                    COUNT(*)::text AS total,
                    COUNT(*) FILTER (WHERE t.status = 'pending' AND t.cancelled_at IS NULL)::text AS pending,
                    COUNT(*) FILTER (WHERE t.status = 'in_progress' AND t.cancelled_at IS NULL)::text AS in_progress,
                    COUNT(*) FILTER (WHERE t.status = 'completed' AND t.cancelled_at IS NULL)::text AS completed,
                    COUNT(*) FILTER (WHERE t.cancelled_at IS NOT NULL)::text AS cancelled
                FROM tasks t
                WHERE t.ranch_id = $1
                `,
                {
                    bind: [ranchId],
                    type: QueryTypes.SELECT,
                }
            )
            : sequelize.query<TaskStatsRow>(
                `
                SELECT
                    COUNT(*)::text AS total,
                    COUNT(*) FILTER (WHERE t.status = 'pending' AND t.cancelled_at IS NULL)::text AS pending,
                    COUNT(*) FILTER (WHERE t.status = 'in_progress' AND t.cancelled_at IS NULL)::text AS in_progress,
                    COUNT(*) FILTER (WHERE t.status = 'completed' AND t.cancelled_at IS NULL)::text AS completed,
                    COUNT(*) FILTER (WHERE t.cancelled_at IS NOT NULL)::text AS cancelled
                FROM tasks t
                WHERE t.ranch_id = $1
                  AND t.assigned_to_user_id = $2
                `,
                {
                    bind: [ranchId, currentUserId],
                    type: QueryTypes.SELECT,
                }
            );

        const submissionApprovalStatsPromise = canManage
            ? sequelize.query<SubmissionApprovalStatsRow>(
                `
                SELECT
                    COUNT(*) FILTER (WHERE ts.status = 'pending')::text AS pending,
                    COUNT(*) FILTER (WHERE ts.status = 'approved')::text AS approved,
                    COUNT(*) FILTER (WHERE ts.status = 'rejected')::text AS rejected
                FROM task_submissions ts
                JOIN tasks t ON t.id = ts.task_id
                WHERE t.ranch_id = $1
                `,
                {
                    bind: [ranchId],
                    type: QueryTypes.SELECT,
                }
            )
            : sequelize.query<SubmissionApprovalStatsRow>(
                `
                SELECT
                    COUNT(*) FILTER (WHERE ts.status = 'pending')::text AS pending,
                    COUNT(*) FILTER (WHERE ts.status = 'approved')::text AS approved,
                    COUNT(*) FILTER (WHERE ts.status = 'rejected')::text AS rejected
                FROM task_submissions ts
                JOIN tasks t ON t.id = ts.task_id
                WHERE t.ranch_id = $1
                  AND t.assigned_to_user_id = $2
                `,
                {
                    bind: [ranchId, currentUserId],
                    type: QueryTypes.SELECT,
                }
            );

        const recentActivityPromise = canManage
            ? sequelize.query<RecentActivityRow>(
                `
                SELECT *
                FROM (
                    SELECT
                        'health'::text AS type,
                        e.public_id AS id,
                        e.created_at,
                        a.public_id AS animal_public_id,
                        a.tag_number AS animal_tag_number,
                        e.status::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        NULL::uuid AS task_public_id,
                        NULL::text AS task_title,
                        NULL::text AS review_status
                    FROM animal_health_events e
                    JOIN animals a ON a.id = e.animal_id
                    WHERE a.ranch_id = $1

                    UNION ALL

                    SELECT
                        'animal_update'::text AS type,
                        ev.public_id AS id,
                        ev.created_at,
                        a.public_id AS animal_public_id,
                        a.tag_number AS animal_tag_number,
                        NULL::text AS status,
                        ev.field,
                        ev.from_value,
                        ev.to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        NULL::uuid AS task_public_id,
                        NULL::text AS task_title,
                        NULL::text AS review_status
                    FROM animal_activity_events ev
                    JOIN animals a ON a.id = ev.animal_id
                    WHERE a.ranch_id = $1

                    UNION ALL

                    SELECT
                        'movement'::text AS type,
                        m.public_id AS id,
                        m.created_at,
                        a.public_id AS animal_public_id,
                        a.tag_number AS animal_tag_number,
                        NULL::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        m.movement_type::text AS movement_type,
                        NULL::text AS vaccine_name,
                        NULL::uuid AS task_public_id,
                        NULL::text AS task_title,
                        NULL::text AS review_status
                    FROM animal_movement_events m
                    JOIN animals a ON a.id = m.animal_id
                    WHERE a.ranch_id = $1

                    UNION ALL

                    SELECT
                        'vaccination'::text AS type,
                        v.public_id AS id,
                        v.created_at,
                        a.public_id AS animal_public_id,
                        a.tag_number AS animal_tag_number,
                        NULL::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        v.vaccine_name::text AS vaccine_name,
                        NULL::uuid AS task_public_id,
                        NULL::text AS task_title,
                        NULL::text AS review_status
                    FROM animal_vaccinations v
                    JOIN animals a ON a.id = v.animal_id
                    WHERE a.ranch_id = $1
                      AND v.deleted_at IS NULL

                    UNION ALL

                    SELECT
                        'task_created'::text AS type,
                        t.public_id AS id,
                        t.created_at,
                        NULL::uuid AS animal_public_id,
                        NULL::text AS animal_tag_number,
                        t.status::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        t.public_id AS task_public_id,
                        t.title AS task_title,
                        NULL::text AS review_status
                    FROM tasks t
                    WHERE t.ranch_id = $1

                    UNION ALL

                    SELECT
                        'task_submission'::text AS type,
                        ts.public_id AS id,
                        ts.created_at,
                        NULL::uuid AS animal_public_id,
                        NULL::text AS animal_tag_number,
                        ts.status::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        t.public_id AS task_public_id,
                        t.title AS task_title,
                        NULL::text AS review_status
                    FROM task_submissions ts
                    JOIN tasks t ON t.id = ts.task_id
                    WHERE t.ranch_id = $1

                    UNION ALL

                    SELECT
                        'task_review'::text AS type,
                        ts.public_id AS id,
                        ts.reviewed_at AS created_at,
                        NULL::uuid AS animal_public_id,
                        NULL::text AS animal_tag_number,
                        ts.status::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        t.public_id AS task_public_id,
                        t.title AS task_title,
                        ts.status::text AS review_status
                    FROM task_submissions ts
                    JOIN tasks t ON t.id = ts.task_id
                    WHERE t.ranch_id = $1
                      AND ts.reviewed_at IS NOT NULL
                ) t
                ORDER BY created_at DESC
                LIMIT 25
                `,
                {
                    bind: [ranchId],
                    type: QueryTypes.SELECT,
                }
            )
            : sequelize.query<RecentActivityRow>(
                `
                SELECT *
                FROM (
                    SELECT
                        'health'::text AS type,
                        e.public_id AS id,
                        e.created_at,
                        a.public_id AS animal_public_id,
                        a.tag_number AS animal_tag_number,
                        e.status::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        NULL::uuid AS task_public_id,
                        NULL::text AS task_title,
                        NULL::text AS review_status
                    FROM animal_health_events e
                    JOIN animals a ON a.id = e.animal_id
                    WHERE a.ranch_id = $1

                    UNION ALL

                    SELECT
                        'animal_update'::text AS type,
                        ev.public_id AS id,
                        ev.created_at,
                        a.public_id AS animal_public_id,
                        a.tag_number AS animal_tag_number,
                        NULL::text AS status,
                        ev.field,
                        ev.from_value,
                        ev.to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        NULL::uuid AS task_public_id,
                        NULL::text AS task_title,
                        NULL::text AS review_status
                    FROM animal_activity_events ev
                    JOIN animals a ON a.id = ev.animal_id
                    WHERE a.ranch_id = $1

                    UNION ALL

                    SELECT
                        'movement'::text AS type,
                        m.public_id AS id,
                        m.created_at,
                        a.public_id AS animal_public_id,
                        a.tag_number AS animal_tag_number,
                        NULL::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        m.movement_type::text AS movement_type,
                        NULL::text AS vaccine_name,
                        NULL::uuid AS task_public_id,
                        NULL::text AS task_title,
                        NULL::text AS review_status
                    FROM animal_movement_events m
                    JOIN animals a ON a.id = m.animal_id
                    WHERE a.ranch_id = $1

                    UNION ALL

                    SELECT
                        'vaccination'::text AS type,
                        v.public_id AS id,
                        v.created_at,
                        a.public_id AS animal_public_id,
                        a.tag_number AS animal_tag_number,
                        NULL::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        v.vaccine_name::text AS vaccine_name,
                        NULL::uuid AS task_public_id,
                        NULL::text AS task_title,
                        NULL::text AS review_status
                    FROM animal_vaccinations v
                    JOIN animals a ON a.id = v.animal_id
                    WHERE a.ranch_id = $1
                      AND v.deleted_at IS NULL

                    UNION ALL

                    SELECT
                        'task_created'::text AS type,
                        t.public_id AS id,
                        t.created_at,
                        NULL::uuid AS animal_public_id,
                        NULL::text AS animal_tag_number,
                        t.status::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        t.public_id AS task_public_id,
                        t.title AS task_title,
                        NULL::text AS review_status
                    FROM tasks t
                    WHERE t.ranch_id = $1
                      AND t.assigned_to_user_id = $2

                    UNION ALL

                    SELECT
                        'task_submission'::text AS type,
                        ts.public_id AS id,
                        ts.created_at,
                        NULL::uuid AS animal_public_id,
                        NULL::text AS animal_tag_number,
                        ts.status::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        t.public_id AS task_public_id,
                        t.title AS task_title,
                        NULL::text AS review_status
                    FROM task_submissions ts
                    JOIN tasks t ON t.id = ts.task_id
                    WHERE t.ranch_id = $1
                      AND t.assigned_to_user_id = $2

                    UNION ALL

                    SELECT
                        'task_review'::text AS type,
                        ts.public_id AS id,
                        ts.reviewed_at AS created_at,
                        NULL::uuid AS animal_public_id,
                        NULL::text AS animal_tag_number,
                        ts.status::text AS status,
                        NULL::text AS field,
                        NULL::text AS from_value,
                        NULL::text AS to_value,
                        NULL::text AS movement_type,
                        NULL::text AS vaccine_name,
                        t.public_id AS task_public_id,
                        t.title AS task_title,
                        ts.status::text AS review_status
                    FROM task_submissions ts
                    JOIN tasks t ON t.id = ts.task_id
                    WHERE t.ranch_id = $1
                      AND t.assigned_to_user_id = $2
                      AND ts.reviewed_at IS NOT NULL
                ) t
                ORDER BY created_at DESC
                LIMIT 25
                `,
                {
                    bind: [ranchId, currentUserId],
                    type: QueryTypes.SELECT,
                }
            );

        const [
            animalStatsResult,
            taskStatsResult,
            submissionApprovalStatsResult,
            recentActivityRows,
            vaccinationRows,
        ] = await Promise.all([
            animalStatsPromise,
            taskStatsPromise,
            submissionApprovalStatsPromise,
            recentActivityPromise,
            vaccinationRowsPromise,
        ]);

        const [animalStats] = animalStatsResult;
        const [taskStats] = taskStatsResult;
        const [submissionApprovalStats] = submissionApprovalStatsResult;

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

        const recentActivity = buildDashboardActivity(recentActivityRows);

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
            tasks: {
                total: Number(taskStats?.total ?? 0),
                pending: Number(taskStats?.pending ?? 0),
                inProgress: Number(taskStats?.in_progress ?? 0),
                completed: Number(taskStats?.completed ?? 0),
                cancelled: Number(taskStats?.cancelled ?? 0),
            },
            submissionApprovals: {
                pending: Number(submissionApprovalStats?.pending ?? 0),
                approved: Number(submissionApprovalStats?.approved ?? 0),
                rejected: Number(submissionApprovalStats?.rejected ?? 0),
            },
            recentActivity,
        });
    } catch (err: any) {
        console.error("GET_RANCH_DASHBOARD_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch ranch dashboard",
            error: err?.message ?? "Unknown error",
        });
    }
}