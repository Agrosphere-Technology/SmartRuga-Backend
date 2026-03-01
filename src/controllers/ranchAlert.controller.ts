import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import { sequelize } from "../models";
import { bulkReadSchema, listAlertsQuerySchema } from "../validators/alert.validator";
import { canManageAlerts, canViewAlerts, parseIntSafe } from "../helpers/alert.helpers";
import { AlertRow } from "../types/alert.dto";


export async function listRanchAlerts(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;
        if (!canViewAlerts(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view ranch alerts",
            });
        }

        const ranchId = req.ranch!.id;

        const page = parseIntSafe(req.query.page, 1);
        const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
        const offset = (page - 1) * limit;

        // filters
        const unread =
            typeof req.query.unread === "string"
                ? req.query.unread === "true"
                    ? true
                    : req.query.unread === "false"
                        ? false
                        : undefined
                : undefined;

        const alertType =
            typeof req.query.alertType === "string" ? req.query.alertType : undefined;

        const animalId =
            typeof req.query.animalId === "string" ? req.query.animalId : undefined;

        const from = typeof req.query.from === "string" ? req.query.from : undefined;
        const to = typeof req.query.to === "string" ? req.query.to : undefined;

        // unreadCount (badge): ranch-wide, not affected by filters
        const unreadCountRows = await sequelize.query<{ unread_count: number }>(
            `
      SELECT COUNT(*)::int AS unread_count
      FROM ranch_alerts
      WHERE ranch_id = $1 AND is_read = false
      `,
            { bind: [ranchId], type: QueryTypes.SELECT }
        );
        const unreadCount = unreadCountRows[0]?.unread_count ?? 0;

        // build WHERE for list + total
        const whereParts: string[] = [`ra.ranch_id = $1`];
        const bind: any[] = [ranchId];
        let idx = 2;

        if (unread === true) {
            whereParts.push(`ra.is_read = false`);
        } else if (unread === false) {
            whereParts.push(`ra.is_read = true`);
        }

        if (alertType) {
            whereParts.push(`ra.alert_type = $${idx++}`);
            bind.push(alertType);
        }

        if (animalId) {
            whereParts.push(`ra.animal_id = $${idx++}::uuid`);
            bind.push(animalId);
        }

        if (from) {
            whereParts.push(`ra.created_at >= $${idx++}::timestamptz`);
            bind.push(from);
        }

        if (to) {
            whereParts.push(`ra.created_at <= $${idx++}::timestamptz`);
            bind.push(to);
        }

        const whereSql = `WHERE ${whereParts.join(" AND ")}`;

        // total
        const countRows = await sequelize.query<{ total: number }>(
            `
      SELECT COUNT(*)::int AS total
      FROM ranch_alerts ra
      ${whereSql}
      `,
            { bind, type: QueryTypes.SELECT }
        );

        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        // rows
        const rows = await sequelize.query<AlertRow>(
            `
      SELECT
        ra.id,
        ra.ranch_id,
        ra.animal_id,
        ra.alert_type,
        ra.message,
        ra.is_read,
        ra.read_at,
        ra.read_by,
        ra.created_at,

        a.public_id AS animal_public_id,
        a.tag_number AS animal_tag_number,

        u.email AS read_by_email,
        u.first_name AS read_by_first_name,
        u.last_name AS read_by_last_name

      FROM ranch_alerts ra
      LEFT JOIN animals a ON a.id = ra.animal_id
      LEFT JOIN users u ON u.id = ra.read_by
      ${whereSql}
      ORDER BY ra.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
      `,
            {
                bind: [...bind, limit, offset],
                type: QueryTypes.SELECT,
            }
        );

        return res.status(StatusCodes.OK).json({
            pagination: { page, limit, total, totalPages },
            unreadCount,
            alerts: rows.map((r) => ({
                id: r.id,
                alertType: r.alert_type,
                message: r.message,
                isRead: r.is_read,
                readAt: r.read_at,
                readBy: r.read_by
                    ? {
                        id: r.read_by,
                        email: r.read_by_email,
                        firstName: r.read_by_first_name,
                        lastName: r.read_by_last_name,
                    }
                    : null,
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