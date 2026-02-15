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
const models_1 = require("../models");
const roles_1 = require("../constants/roles");
const addHealthSchema = zod_1.default.object({
    status: zod_1.default.enum(["healthy", "sick", "recovering", "quarantined"]),
    notes: zod_1.default.string().max(500).optional().nullable(),
});
const historyQuerySchema = zod_1.default.object({
    page: zod_1.default.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.default.coerce.number().int().min(1).max(100).optional().default(20),
    status: zod_1.default.enum(["healthy", "sick", "recovering", "quarantined"]).optional(),
    from: zod_1.default.string().datetime().optional(),
    to: zod_1.default.string().datetime().optional(),
});
function canAddHealth(role) {
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
function canViewHealth(role) {
    // you can loosen this later if you want all active members to view
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
// POST /api/v1/ranches/:slug/animals/:animalId/health
async function addAnimalHealthEvent(req, res) {
    try {
        const parsed = addHealthSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }
        const ranchId = req.ranch.id;
        const { animalId } = req.params;
        const requesterRole = req.membership.ranchRole;
        if (!canAddHealth(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can add health records",
            });
        }
        const animal = await models_1.Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }
        const { status, notes } = parsed.data;
        const recorderId = req.user.id;
        // INSERT + RETURNING (use QueryTypes.SELECT in Sequelize typings)
        const rows = await models_1.sequelize.query(`
      INSERT INTO animal_health_events (id, animal_id, status, notes, recorded_by, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      RETURNING id, animal_id, status, notes, recorded_by, created_at
      `, {
            bind: [animalId, status, notes ?? null, recorderId],
            type: sequelize_1.QueryTypes.SELECT,
        });
        const event = rows[0];
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            message: "Health event recorded",
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            healthEvent: {
                id: event.id,
                status: event.status,
                notes: event.notes,
                recordedBy: event.recorded_by,
                createdAt: event.created_at,
            },
            healthStatus: event.status, // latest health
        });
    }
    catch (err) {
        console.error("ADD_ANIMAL_HEALTH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to add animal health event",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
// GET /api/v1/ranches/:slug/animals/:animalId/health
// (simple list: status+notes+createdAt)
async function listAnimalHealth(req, res) {
    try {
        const ranchId = req.ranch.id;
        const { animalId } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id"],
        });
        if (!animal) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }
        const rows = await models_1.sequelize.query(`
      SELECT id, status, notes, created_at
      FROM animal_health_events
      WHERE animal_id = $1
      ORDER BY created_at DESC
      `, {
            bind: [animalId],
            type: sequelize_1.QueryTypes.SELECT,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            healthEvents: rows.map((r) => ({
                id: r.id,
                status: r.status,
                notes: r.notes,
                createdAt: r.created_at,
            })),
        });
    }
    catch (err) {
        console.error("LIST_ANIMAL_HEALTH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list animal health history",
            error: err?.message ?? "Unknown error",
        });
    }
}
// GET /api/v1/ranches/:slug/animals/:animalId/health/latest
async function getAnimalLatestHealth(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!canViewHealth(requesterRole)) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Only owner/manager/vet can view health" });
        }
        const ranchId = req.ranch.id;
        const { animalId } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }
        const rows = await models_1.sequelize.query(`
      SELECT id, status, notes, created_at
      FROM animal_health_events
      WHERE animal_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `, { bind: [animalId], type: sequelize_1.QueryTypes.SELECT });
        const latest = rows[0] ?? null;
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            latest: latest
                ? {
                    id: latest.id,
                    status: latest.status,
                    notes: latest.notes,
                    createdAt: latest.created_at,
                }
                : null,
            healthStatus: latest?.status ?? "healthy",
        });
    }
    catch (err) {
        console.error("GET_LATEST_HEALTH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch latest health",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
// GET /api/v1/ranches/:slug/animals/:animalId/health/history?page=&limit=&status=&from=&to=
async function listAnimalHealthHistory(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!canViewHealth(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can view health history",
            });
        }
        const ranchId = req.ranch.id;
        const { animalId } = req.params;
        const qp = historyQuerySchema.safeParse(req.query);
        if (!qp.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                message: "Invalid query params",
                issues: qp.error.issues,
            });
        }
        const { page, limit, status, from, to } = qp.data;
        const offset = (page - 1) * limit;
        // ensure animal belongs to ranch
        const animal = await models_1.Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }
        // dynamic WHERE
        const whereParts = ["e.animal_id = $1"];
        const bind = [animalId];
        let i = 2;
        if (status) {
            whereParts.push(`e.status = $${i}`);
            bind.push(status);
            i++;
        }
        if (from) {
            whereParts.push(`e.created_at >= $${i}`);
            bind.push(new Date(from));
            i++;
        }
        if (to) {
            whereParts.push(`e.created_at <= $${i}`);
            bind.push(new Date(to));
            i++;
        }
        const whereSql = whereParts.join(" AND ");
        // total count
        const countRows = await models_1.sequelize.query(`
      SELECT COUNT(*)::text as count
      FROM animal_health_events e
      WHERE ${whereSql}
      `, { bind, type: sequelize_1.QueryTypes.SELECT });
        const total = Number(countRows[0]?.count ?? "0");
        // data rows
        const dataBind = [...bind, limit, offset];
        const rows = await models_1.sequelize.query(`
      SELECT
        e.id,
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
      LIMIT $${i} OFFSET $${i + 1}
      `, {
            bind: dataBind,
            type: sequelize_1.QueryTypes.SELECT,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            animal: {
                id: animal.get("id"),
                publicId: animal.get("public_id"),
                tagNumber: animal.get("tag_number"),
            },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            events: rows.map((r) => ({
                id: r.id,
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
        });
    }
    catch (err) {
        console.error("LIST_ANIMAL_HEALTH_HISTORY_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list animal health history",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
