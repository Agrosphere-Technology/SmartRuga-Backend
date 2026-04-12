import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import { Animal, RanchAlert, User } from "../models";
import {
    bulkReadSchema,
    listRanchAlertsQuerySchema,
} from "../validators/ranchAlert.validator";
import {
    canManageAlerts,
    canViewAlerts,
    formatRanchAlert,
} from "../helpers/ranchAlert.helpers";

export async function listRanchAlerts(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;

        if (!canViewAlerts(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view ranch alerts",
            });
        }

        const ranchId = req.ranch!.id;

        const parsed = listRanchAlertsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            });
        }

        const { page, limit, unread, alertType, animalId, from, to } = parsed.data;

        const offset = (page - 1) * limit;

        const whereClause: any = {
            ranch_id: ranchId,
        };

        if (typeof unread === "boolean") {
            whereClause.is_read = !unread ? true : false;
        }

        if (alertType?.length) {
            whereClause.alert_type = {
                [Op.in]: alertType,
            };
        }

        if (animalId) {
            whereClause.animal_id = animalId;
        }

        if (from || to) {
            whereClause.created_at = {};

            if (from) {
                whereClause.created_at[Op.gte] = new Date(`${from}T00:00:00.000Z`);
            }

            if (to) {
                whereClause.created_at[Op.lt] = new Date(`${to}T23:59:59.999Z`);
            }
        }

        const { count, rows } = await RanchAlert.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Animal,
                    as: "animal",
                    required: false,
                },
                {
                    model: User,
                    as: "readByUser",
                    required: false,
                },
            ],
            order: [["created_at", "DESC"]],
            limit,
            offset,
            distinct: true,
        });

        const totalItems = count;
        const totalPages = Math.ceil(totalItems / limit) || 1;

        const unreadCount = await RanchAlert.count({
            where: {
                ranch_id: ranchId,
                is_read: false,
            },
        });

        return res.status(StatusCodes.OK).json({
            alerts: rows.map((alert) => formatRanchAlert(alert)),
            unreadCount,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        });
    } catch (err: any) {
        console.error("LIST_RANCH_ALERTS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list ranch alerts",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function getUnreadRanchAlertsCount(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;

        if (!canViewAlerts(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view ranch alerts",
            });
        }

        const ranchId = req.ranch!.id;

        const unreadCount = await RanchAlert.count({
            where: {
                ranch_id: ranchId,
                is_read: false,
            },
        });

        return res.status(StatusCodes.OK).json({
            unreadCount,
        });
    } catch (err: any) {
        console.error("GET_UNREAD_RANCH_ALERTS_COUNT_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch unread ranch alerts count",
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
        const userId = req.user!.id;
        const { alertId } = req.params;

        const alert = await RanchAlert.findOne({
            where: {
                public_id: alertId,
                ranch_id: ranchId,
            },
        });

        if (!alert) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Alert not found",
            });
        }

        if (alert.getDataValue("is_read")) {
            const existingAlert = await RanchAlert.findOne({
                where: {
                    public_id: alertId,
                    ranch_id: ranchId,
                },
                include: [
                    {
                        model: Animal,
                        as: "animal",
                        required: false,
                    },
                    {
                        model: User,
                        as: "readByUser",
                        required: false,
                    },
                ],
            });

            return res.status(StatusCodes.OK).json({
                message: "Alert already marked as read",
                alert: existingAlert ? formatRanchAlert(existingAlert) : null,
            });
        }

        await alert.update({
            is_read: true,
            read_at: new Date(),
            read_by: userId,
            updated_at: new Date(),
        });

        const updatedAlert = await RanchAlert.findOne({
            where: {
                public_id: alertId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: Animal,
                    as: "animal",
                    required: false,
                },
                {
                    model: User,
                    as: "readByUser",
                    required: false,
                },
            ],
        });

        return res.status(StatusCodes.OK).json({
            message: "Alert marked as read successfully",
            alert: updatedAlert ? formatRanchAlert(updatedAlert) : null,
        });
    } catch (err: any) {
        console.error("MARK_RANCH_ALERT_AS_READ_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to mark ranch alert as read",
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

        const ranchId = req.ranch!.id;
        const userId = req.user!.id;

        const parsed = bulkReadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            });
        }

        const { alertIds } = parsed.data;

        const [updatedCount] = await RanchAlert.update(
            {
                is_read: true,
                read_at: new Date(),
                read_by: userId,
                updated_at: new Date(),
            },
            {
                where: {
                    ranch_id: ranchId,
                    public_id: {
                        [Op.in]: alertIds,
                    },
                    is_read: false,
                },
            }
        );

        return res.status(StatusCodes.OK).json({
            message: "Alerts marked as read successfully",
            updatedCount,
        });
    } catch (err: any) {
        console.error("MARK_ALERTS_READ_BULK_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to mark alerts as read",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function markAllRanchAlertsAsRead(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;

        if (!canManageAlerts(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can update alerts",
            });
        }

        const ranchId = req.ranch!.id;
        const userId = req.user!.id;

        const [updatedCount] = await RanchAlert.update(
            {
                is_read: true,
                read_at: new Date(),
                read_by: userId,
                updated_at: new Date(),
            },
            {
                where: {
                    ranch_id: ranchId,
                    is_read: false,
                },
            }
        );

        return res.status(StatusCodes.OK).json({
            message: "All unread alerts marked as read successfully",
            updatedCount,
        });
    } catch (err: any) {
        console.error("MARK_ALL_RANCH_ALERTS_AS_READ_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to mark all ranch alerts as read",
            error: err?.message ?? "Unknown error",
        });
    }
}