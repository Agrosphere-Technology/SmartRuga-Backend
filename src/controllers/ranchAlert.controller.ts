import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import { sequelize } from "../models";
import { bulkReadSchema, listAlertsQuerySchema } from "../validators/alert.validator";
import { canManageAlerts, canViewAlerts } from "../helpers/alert.helpers";
import { AlertRow, CountRow } from "../types/alert.dto";


export async function listRanchAlerts(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canViewAlerts(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view ranch alerts",
            });
        }

        const ranchId = req.ranch!.id;

        const parsed = listAlertsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid query params",
                issues: parsed.error.issues,
            });
        }

        const { page, limit, type, unread } = parsed.data;
        const offset = (page - 1) * limit;

        const whereParts: string[] = [`a.ranch_id = $1`];
        const bind: any[] = [ranchId];
        let idx = 2;

        // type filter (array) -> IN (...)
        if (type && type.length) {
            const placeholders = type.map(() => `$${idx++}`).join(", ");
            whereParts.push(`a.alert_type IN (${placeholders})`);
            bind.push(...type);
        }

        // unread filter
        if (unread === true) {
            whereParts.push(`a.is_read = false`);
        } else if (unread === false) {
            whereParts.push(`a.is_read = true`);
        }

        const whereSql = `WHERE ${whereParts.join(" AND ")}`;

        // count
        const countRows = await sequelize.query<CountRow>(
            `
        SELECT COUNT(*)::int AS total
        FROM ranch_alerts a
        ${whereSql}
      `,
            { bind, type: QueryTypes.SELECT }
        );

        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        // list
        const rows = await sequelize.query<AlertRow>(
            `
        SELECT
          a.id,
          a.ranch_id,
          a.animal_id,
          a.alert_type,
          a.message,
          a.is_read,
          a.created_at,
          an.public_id AS animal_public_id,
          an.tag_number AS animal_tag_number
        FROM ranch_alerts a
        LEFT JOIN animals an ON an.id = a.animal_id
        ${whereSql}
        ORDER BY a.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `,
            {
                bind: [...bind, limit, offset],
                type: QueryTypes.SELECT,
            }
        );

        return res.status(StatusCodes.OK).json({
            pagination: { page, limit, total, totalPages },
            alerts: rows.map((r) => ({
                id: r.id,
                type: r.alert_type,
                message: r.message,
                read: r.is_read,
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
        console.error("LIST_RANCH_ALERTS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list ranch alerts",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function markAlertRead(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canManageAlerts(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can update alerts",
            });
        }

        const ranchId = req.ranch!.id;
        const { alertId } = req.params;

        // Ensure alert belongs to this ranch
        const updated = await sequelize.query<{ id: string }>(
            `
  UPDATE ranch_alerts
  SET is_read = true
  WHERE id = $1::uuid
    AND ranch_id = $2::uuid
    AND is_read = false
  RETURNING id
  `,
            { bind: [alertId, ranchId], type: QueryTypes.SELECT }
        );

        // if nothing updated, it either doesn't exist OR already read.
        // so we check existence quickly:
        if (!updated[0]) {
            const exists = await sequelize.query<{ id: string; is_read: boolean }>(
                `
                    SELECT id, is_read
                    FROM ranch_alerts
                    WHERE id = $1::uuid AND ranch_id = $2::uuid
                    LIMIT 1
                `,
                { bind: [alertId, ranchId], type: QueryTypes.SELECT }
            );

            if (!exists[0]) {
                return res.status(StatusCodes.NOT_FOUND).json({ message: "Alert not found" });
            }

            return res.status(StatusCodes.OK).json({
                message: "Alert already read",
                id: exists[0].id,
                alreadyRead: true,
            });
        }

        return res.status(StatusCodes.OK).json({
            message: "Alert marked as read",
            id: updated[0].id,
            alreadyRead: false,
        });

    } catch (err: any) {
        console.error("MARK_ALERT_READ_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to mark alert as read",
            error: err?.message ?? "Unknown error",
        });
    }
}


export async function markAlertsReadBulk(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canManageAlerts(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can update alerts",
            });
        }

        const parsed = bulkReadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }

        const ranchId = req.ranch!.id;
        const { alertIds } = parsed.data;

        // Use ANY($1::uuid[]) safely
        const rows = await sequelize.query<{ id: string }>(
            `
                UPDATE ranch_alerts
                SET is_read = true
                WHERE ranch_id = $1::uuid
                    AND id = ANY($2::uuid[])
                    AND is_read = false
                RETURNING id
            `,
            { bind: [ranchId, alertIds], type: QueryTypes.SELECT }
        );

        return res.status(StatusCodes.OK).json({
            message: "Alerts marked as read",
            updated: rows.length,
        });
    } catch (err: any) {
        console.error("MARK_ALERTS_READ_BULK_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to mark alerts as read",
            error: err?.message ?? "Unknown error",
        });
    }
}