"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRanchAlerts = listRanchAlerts;
exports.getUnreadRanchAlertsCount = getUnreadRanchAlertsCount;
exports.markAlertRead = markAlertRead;
exports.markAlertsReadBulk = markAlertsReadBulk;
exports.markAllRanchAlertsAsRead = markAllRanchAlertsAsRead;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const ranchAlert_validator_1 = require("../validators/ranchAlert.validator");
const ranchAlert_helpers_1 = require("../helpers/ranchAlert.helpers");
const apiResponse_1 = require("../utils/apiResponse");
async function listRanchAlerts(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!(0, ranchAlert_helpers_1.canViewAlerts)(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can view ranch alerts",
            }));
        }
        const ranchId = req.ranch.id;
        const parsed = ranchAlert_validator_1.listRanchAlertsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const { page, limit, unread, alertType, animalId, from, to } = parsed.data;
        const offset = (page - 1) * limit;
        const whereClause = {
            ranch_id: ranchId,
        };
        if (typeof unread === "boolean") {
            whereClause.is_read = unread ? false : true;
        }
        if (alertType?.length) {
            whereClause.alert_type = {
                [sequelize_1.Op.in]: alertType,
            };
        }
        if (animalId) {
            whereClause.animal_id = animalId;
        }
        if (from || to) {
            whereClause.created_at = {};
            if (from) {
                whereClause.created_at[sequelize_1.Op.gte] = new Date(`${from}T00:00:00.000Z`);
            }
            if (to) {
                whereClause.created_at[sequelize_1.Op.lt] = new Date(`${to}T23:59:59.999Z`);
            }
        }
        const { count, rows } = await models_1.RanchAlert.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: models_1.Animal,
                    as: "animal",
                    required: false,
                },
                {
                    model: models_1.User,
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
        const unreadCount = await models_1.RanchAlert.count({
            where: {
                ranch_id: ranchId,
                is_read: false,
            },
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Ranch alerts fetched successfully",
            data: {
                alerts: rows.map((alert) => (0, ranchAlert_helpers_1.formatRanchAlert)(alert)),
            },
            meta: {
                unreadCount,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
                filters: {
                    unread: typeof unread === "boolean" ? unread : null,
                    alertType: alertType ?? [],
                    animalId: animalId ?? null,
                    from: from ?? null,
                    to: to ?? null,
                },
            },
        }));
    }
    catch (err) {
        console.error("LIST_RANCH_ALERTS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list ranch alerts",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function getUnreadRanchAlertsCount(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!(0, ranchAlert_helpers_1.canViewAlerts)(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can view ranch alerts",
            }));
        }
        const ranchId = req.ranch.id;
        const unreadCount = await models_1.RanchAlert.count({
            where: {
                ranch_id: ranchId,
                is_read: false,
            },
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Unread ranch alerts count fetched successfully",
            data: {
                unreadCount,
            },
        }));
    }
    catch (err) {
        console.error("GET_UNREAD_RANCH_ALERTS_COUNT_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch unread ranch alerts count",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function markAlertRead(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!(0, ranchAlert_helpers_1.canManageAlerts)(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can update alerts",
            }));
        }
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const { alertId } = req.params;
        const alert = await models_1.RanchAlert.findOne({
            where: {
                public_id: alertId,
                ranch_id: ranchId,
            },
        });
        if (!alert) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Alert not found",
            }));
        }
        if (alert.getDataValue("is_read")) {
            const existingAlert = await models_1.RanchAlert.findOne({
                where: {
                    public_id: alertId,
                    ranch_id: ranchId,
                },
                include: [
                    {
                        model: models_1.Animal,
                        as: "animal",
                        required: false,
                    },
                    {
                        model: models_1.User,
                        as: "readByUser",
                        required: false,
                    },
                ],
            });
            return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
                message: "Alert already marked as read",
                data: {
                    alert: existingAlert ? (0, ranchAlert_helpers_1.formatRanchAlert)(existingAlert) : null,
                },
            }));
        }
        await alert.update({
            is_read: true,
            read_at: new Date(),
            read_by: userId,
            updated_at: new Date(),
        });
        const updatedAlert = await models_1.RanchAlert.findOne({
            where: {
                public_id: alertId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: models_1.Animal,
                    as: "animal",
                    required: false,
                },
                {
                    model: models_1.User,
                    as: "readByUser",
                    required: false,
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Alert marked as read successfully",
            data: {
                alert: updatedAlert ? (0, ranchAlert_helpers_1.formatRanchAlert)(updatedAlert) : null,
            },
        }));
    }
    catch (err) {
        console.error("MARK_RANCH_ALERT_AS_READ_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to mark ranch alert as read",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function markAlertsReadBulk(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!(0, ranchAlert_helpers_1.canManageAlerts)(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can update alerts",
            }));
        }
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const parsed = ranchAlert_validator_1.bulkReadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const { alertIds } = parsed.data;
        const [updatedCount] = await models_1.RanchAlert.update({
            is_read: true,
            read_at: new Date(),
            read_by: userId,
            updated_at: new Date(),
        }, {
            where: {
                ranch_id: ranchId,
                public_id: {
                    [sequelize_1.Op.in]: alertIds,
                },
                is_read: false,
            },
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Alerts marked as read successfully",
            data: {
                updatedCount,
            },
        }));
    }
    catch (err) {
        console.error("MARK_ALERTS_READ_BULK_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to mark alerts as read",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function markAllRanchAlertsAsRead(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!(0, ranchAlert_helpers_1.canManageAlerts)(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can update alerts",
            }));
        }
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const [updatedCount] = await models_1.RanchAlert.update({
            is_read: true,
            read_at: new Date(),
            read_by: userId,
            updated_at: new Date(),
        }, {
            where: {
                ranch_id: ranchId,
                is_read: false,
            },
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "All unread alerts marked as read successfully",
            data: {
                updatedCount,
            },
        }));
    }
    catch (err) {
        console.error("MARK_ALL_RANCH_ALERTS_AS_READ_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to mark all ranch alerts as read",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
