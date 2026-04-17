"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRanchActivity = listRanchActivity;
exports.listAnimalActivity = listAnimalActivity;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const roles_1 = require("../constants/roles");
const zod_1 = __importDefault(require("zod"));
const apiResponse_1 = require("../utils/apiResponse");
function canViewActivity(role) {
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
function parseIntSafe(val, def) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}
async function listRanchActivity(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!canViewActivity(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can view ranch activity",
            }));
        }
        const ranchId = req.ranch.id;
        const page = parseIntSafe(req.query.page, 1);
        const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
        const offset = (page - 1) * limit;
        const eventType = typeof req.query.eventType === "string" ? req.query.eventType : undefined;
        const animalId = typeof req.query.animalId === "string" ? req.query.animalId : undefined;
        const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
        const from = typeof req.query.from === "string" ? req.query.from : undefined;
        const to = typeof req.query.to === "string" ? req.query.to : undefined;
        const whereParts = [`e.ranch_id = $1`];
        const bind = [ranchId];
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
        const countRows = await models_1.sequelize.query(`
      SELECT COUNT(*)::int AS total
      FROM animal_activity_events e
      ${whereSql}
      `, { bind, type: sequelize_1.QueryTypes.SELECT });
        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const rows = await models_1.sequelize.query(`
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
      `, {
            bind: [...bind, limit, offset],
            type: sequelize_1.QueryTypes.SELECT,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Ranch activity fetched successfully",
            data: {
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
            },
            meta: {
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
                filters: {
                    eventType: eventType ?? null,
                    animalId: animalId ?? null,
                    userId: userId ?? null,
                    from: from ?? null,
                    to: to ?? null,
                },
            },
        }));
    }
    catch (err) {
        console.error("LIST_RANCH_ACTIVITY_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list ranch activity",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function listAnimalActivity(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        if (!canViewActivity(requesterRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner/manager/vet can view animal activity",
            }));
        }
        const ranchId = req.ranch.id;
        const { animalId } = req.params;
        const uuid = zod_1.default.string().uuid();
        if (animalId && !uuid.safeParse(animalId).success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "animalId must be uuid",
            }));
        }
        const animal = await models_1.Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const page = parseIntSafe(req.query.page, 1);
        const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
        const offset = (page - 1) * limit;
        const countRows = await models_1.sequelize.query(`
      SELECT COUNT(*)::int AS total
      FROM animal_activity_events e
      WHERE e.ranch_id = $1 AND e.animal_id = $2::uuid
      `, { bind: [ranchId, animalId], type: sequelize_1.QueryTypes.SELECT });
        const total = countRows[0]?.total ?? 0;
        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
        const rows = await models_1.sequelize.query(`
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
      `, {
            bind: [ranchId, animalId, limit, offset],
            type: sequelize_1.QueryTypes.SELECT,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Animal activity fetched successfully",
            data: {
                animal: {
                    id: animal.get("id"),
                    publicId: animal.get("public_id"),
                    tagNumber: animal.get("tag_number"),
                },
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
            },
            meta: {
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
        console.error("LIST_ANIMAL_ACTIVITY_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list animal activity",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
