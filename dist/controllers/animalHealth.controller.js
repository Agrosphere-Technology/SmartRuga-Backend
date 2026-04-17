"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAnimalHealthEvent = addAnimalHealthEvent;
exports.listAnimalHealth = listAnimalHealth;
exports.getAnimalLatestHealth = getAnimalLatestHealth;
exports.listAnimalHealthHistory = listAnimalHealthHistory;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const zod_1 = __importDefault(require("zod"));
const ranchAlert_service_1 = require("../services/ranchAlert.service");
const models_1 = require("../models");
const roles_1 = require("../constants/roles");
const apiResponse_1 = require("../utils/apiResponse");
const historyQuerySchema = zod_1.default.object({
    page: zod_1.default
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 1))
        .refine((n) => Number.isFinite(n) && n >= 1, "page must be >= 1"),
    limit: zod_1.default
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 20))
        .refine((n) => Number.isFinite(n) && n >= 1 && n <= 100, "limit must be 1..100"),
    status: zod_1.default.enum(["healthy", "sick", "recovering", "quarantined"]).optional(),
    from: zod_1.default.string().optional(),
    to: zod_1.default.string().optional(),
});
const addHealthSchema = zod_1.default.object({
    status: zod_1.default.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: zod_1.default.string().max(500).optional().nullable(),
});
function canViewHealth(role) {
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
function canAddHealth(role) {
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
function parseDateOnlyToUTCStart(dateStr) {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}
function parseDateOnlyToUTCEndExclusive(dateStr) {
    const start = parseDateOnlyToUTCStart(dateStr);
    if (!start)
        return null;
    const next = new Date(start);
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
}
// POST /api/v1/ranches/:slug/animals/:animalId/health
async function addAnimalHealthEvent(req, res) {
    let t = null;
    try {
        const parsed = addHealthSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const ranchId = req.ranch.id;
        const animalIdParam = String(req.params.animalId);
        const requesterRole = req.membership.ranchRole;
        if (!canAddHealth(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can add health records",
            }));
        }
        const animal = await models_1.Animal.findOne({
            where: { id: animalIdParam, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const internalAnimalId = String(animal.get("id"));
        const animalPublicId = String(animal.get("public_id"));
        const animalTagNumber = animal.get("tag_number");
        const { status, notes } = parsed.data;
        const recorderId = req.user.id;
        t = await models_1.sequelize.transaction();
        const rows = await models_1.sequelize.query(`
      INSERT INTO animal_health_events (
        id,
        public_id,
        animal_id,
        status,
        notes,
        recorded_by,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        NOW()
      )
      RETURNING id, public_id, animal_id, status, notes, recorded_by, created_at
      `, {
            bind: [internalAnimalId, status, notes ?? null, recorderId],
            type: sequelize_1.QueryTypes.SELECT,
            transaction: t,
        });
        const event = rows[0];
        if (event.status === "sick" || event.status === "quarantined") {
            const alertType = event.status === "sick" ? "health_sick" : "health_quarantined";
            const tag = animalTagNumber ?? "UN-TAGGED";
            const msg = `Animal ${tag} marked ${event.status}.${event.notes ? ` ${event.notes}` : ""}`.trim();
            await (0, ranchAlert_service_1.createRanchAlert)({
                ranchId,
                animalId: internalAnimalId,
                alertType,
                title: event.status === "sick"
                    ? "Animal health alert"
                    : "Animal quarantine alert",
                message: msg,
                priority: "high",
                entityType: "animal",
                entityPublicId: animalPublicId,
                transaction: t,
                dedupe: true,
                dedupeMinutes: 60,
            });
        }
        await t.commit();
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Health event recorded successfully",
            data: {
                animal: {
                    id: internalAnimalId,
                    publicId: animalPublicId,
                    tagNumber: animalTagNumber,
                },
                healthEvent: {
                    id: event.id,
                    publicId: event.public_id,
                    status: event.status,
                    notes: event.notes,
                    recordedBy: event.recorded_by,
                    createdAt: event.created_at,
                },
                healthStatus: event.status,
            },
        }));
    }
    catch (err) {
        if (t) {
            await t.rollback();
        }
        console.error("ADD_ANIMAL_HEALTH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to add animal health event",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// GET /api/v1/ranches/:slug/animals/:animalId/health
async function listAnimalHealth(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!canViewHealth(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can view health history",
            }));
        }
        const ranchId = req.ranch.id;
        const { animalId } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const internalAnimalId = String(animal.get("id"));
        const rows = await models_1.sequelize.query(`
      SELECT id, public_id, status, notes, created_at
      FROM animal_health_events
      WHERE animal_id = $1
      ORDER BY created_at DESC
      `, {
            bind: [internalAnimalId],
            type: sequelize_1.QueryTypes.SELECT,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Animal health records fetched successfully",
            data: {
                healthEvents: rows.map((r) => ({
                    id: r.id,
                    publicId: r.public_id,
                    status: r.status,
                    notes: r.notes,
                    createdAt: r.created_at,
                })),
            },
        }));
    }
    catch (err) {
        console.error("LIST_ANIMAL_HEALTH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list animal health history",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// GET /api/v1/ranches/:slug/animals/:animalId/health/latest
async function getAnimalLatestHealth(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!canViewHealth(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can view health",
            }));
        }
        const ranchId = req.ranch.id;
        const { animalId } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const internalAnimalId = String(animal.get("id"));
        const rows = await models_1.sequelize.query(`
      SELECT id, public_id, status, notes, created_at
      FROM animal_health_events
      WHERE animal_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `, {
            bind: [internalAnimalId],
            type: sequelize_1.QueryTypes.SELECT,
        });
        const latest = rows[0] ?? null;
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Latest animal health fetched successfully",
            data: {
                animal: {
                    id: animal.get("id"),
                    publicId: animal.get("public_id"),
                    tagNumber: animal.get("tag_number"),
                },
                latest: latest
                    ? {
                        id: latest.id,
                        publicId: latest.public_id,
                        status: latest.status,
                        notes: latest.notes,
                        createdAt: latest.created_at,
                    }
                    : null,
                healthStatus: latest?.status ?? "healthy",
            },
        }));
    }
    catch (err) {
        console.error("GET_LATEST_HEALTH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch latest health",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
// GET /api/v1/ranches/:slug/animals/:animalId/health/history
async function listAnimalHealthHistory(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!canViewHealth(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can view health history",
            }));
        }
        const ranchId = req.ranch.id;
        const { animalId } = req.params;
        const parsedQ = historyQuerySchema.safeParse(req.query);
        if (!parsedQ.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid query params",
                errors: parsedQ.error.issues,
            }));
        }
        const { page, limit, status, from, to } = parsedQ.data;
        const offset = (page - 1) * limit;
        const animal = await models_1.Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const internalAnimalId = String(animal.get("id"));
        const whereParts = [`e.animal_id = $1`];
        const bind = [internalAnimalId];
        if (status) {
            bind.push(status);
            whereParts.push(`e.status = $${bind.length}`);
        }
        if (from) {
            const fromDate = parseDateOnlyToUTCStart(from);
            if (!fromDate) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                    message: "from must be YYYY-MM-DD",
                }));
            }
            bind.push(fromDate);
            whereParts.push(`e.created_at >= $${bind.length}`);
        }
        if (to) {
            const toDateExclusive = parseDateOnlyToUTCEndExclusive(to);
            if (!toDateExclusive) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                    message: "to must be YYYY-MM-DD",
                }));
            }
            bind.push(toDateExclusive);
            whereParts.push(`e.created_at < $${bind.length}`);
        }
        const whereSql = whereParts.join(" AND ");
        const countRows = await models_1.sequelize.query(`
      SELECT COUNT(*)::int AS total
      FROM animal_health_events e
      WHERE ${whereSql}
      `, {
            bind,
            type: sequelize_1.QueryTypes.SELECT,
        });
        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const dataBind = [...bind, limit, offset];
        const limitPos = dataBind.length - 1;
        const offsetPos = dataBind.length;
        const rows = await models_1.sequelize.query(`
      SELECT
        e.id,
        e.public_id,
        e.animal_id,
        e.status,
        e.notes,
        e.recorded_by,
        u.email AS recorded_by_email,
        u.first_name AS recorded_by_first_name,
        u.last_name AS recorded_by_last_name,
        e.created_at
      FROM animal_health_events e
      JOIN users u ON u.id = e.recorded_by
      WHERE ${whereSql}
      ORDER BY e.created_at DESC
      LIMIT $${limitPos}
      OFFSET $${offsetPos}
      `, {
            bind: dataBind,
            type: sequelize_1.QueryTypes.SELECT,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Animal health history fetched successfully",
            data: {
                animal: {
                    id: animal.get("id"),
                    publicId: animal.get("public_id"),
                    tagNumber: animal.get("tag_number"),
                },
                events: rows.map((r) => ({
                    id: r.id,
                    publicId: r.public_id,
                    status: r.status,
                    notes: r.notes,
                    recordedBy: {
                        id: r.recorded_by,
                        email: r.recorded_by_email,
                        firstName: r.recorded_by_first_name,
                        lastName: r.recorded_by_last_name,
                    },
                    createdAt: r.created_at,
                })),
            },
            meta: {
                filters: {
                    status: status ?? null,
                    from: from ?? null,
                    to: to ?? null,
                },
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
            },
        }));
    }
    catch (err) {
        console.error("LIST_ANIMAL_HEALTH_HISTORY_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list animal health history",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
