"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnimalMovement = createAnimalMovement;
exports.listAnimalMovements = listAnimalMovements;
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
const roles_1 = require("../constants/roles");
const animalMovement_validator_1 = require("../validators/animalMovement.validator");
const apiResponse_1 = require("../utils/apiResponse");
async function createAnimalMovement(req, res) {
    try {
        const requesterRole = req.membership.ranchRole;
        const canRecordMovement = requesterRole === roles_1.RANCH_ROLES.OWNER ||
            requesterRole === roles_1.RANCH_ROLES.MANAGER ||
            requesterRole === roles_1.RANCH_ROLES.VET ||
            requesterRole === roles_1.RANCH_ROLES.WORKER;
        if (!canRecordMovement) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Not allowed to record animal movement",
            }));
        }
        const parsed = animalMovement_validator_1.recordAnimalMovementSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const ranchId = req.ranch.id;
        const recorderId = req.user.id;
        const { id } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { public_id: id, ranch_id: ranchId },
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const { movementType, fromLocationId, toLocationId, notes } = parsed.data;
        let fromLocation = null;
        let toLocation = null;
        if (fromLocationId) {
            fromLocation = await models_1.RanchLocation.findOne({
                where: {
                    public_id: fromLocationId,
                    ranch_id: ranchId,
                },
            });
            if (!fromLocation) {
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                    message: "From location not found",
                }));
            }
        }
        if (toLocationId) {
            toLocation = await models_1.RanchLocation.findOne({
                where: {
                    public_id: toLocationId,
                    ranch_id: ranchId,
                },
            });
            if (!toLocation) {
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                    message: "To location not found",
                }));
            }
        }
        const movement = await models_1.AnimalMovementEvent.create({
            ranch_id: ranchId,
            animal_id: animal.get("id"),
            movement_type: movementType,
            from_location_id: fromLocation ? fromLocation.get("id") : null,
            to_location_id: toLocation ? toLocation.get("id") : null,
            notes: notes?.trim() || null,
            recorded_by: recorderId,
            created_at: new Date(),
        });
        animal.set("current_location_id", toLocation ? toLocation.get("id") : null);
        await animal.save();
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Animal movement recorded successfully",
            data: {
                movement: {
                    id: movement.get("id"),
                    animalId: animal.get("public_id"),
                    movementType: movement.get("movement_type"),
                    fromLocation: fromLocation
                        ? {
                            id: fromLocation.get("public_id"),
                            name: fromLocation.get("name"),
                            code: fromLocation.get("code"),
                            locationType: fromLocation.get("location_type"),
                        }
                        : null,
                    toLocation: toLocation
                        ? {
                            id: toLocation.get("public_id"),
                            name: toLocation.get("name"),
                            code: toLocation.get("code"),
                            locationType: toLocation.get("location_type"),
                        }
                        : null,
                    notes: movement.get("notes"),
                    createdAt: movement.get("created_at"),
                },
            },
        }));
    }
    catch (err) {
        console.error("CREATE_ANIMAL_MOVEMENT_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to record animal movement",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function listAnimalMovements(req, res) {
    try {
        const ranchId = req.ranch.id;
        const { id } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { public_id: id, ranch_id: ranchId },
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const rows = await models_1.AnimalMovementEvent.findAll({
            where: { ranch_id: ranchId, animal_id: animal.get("id") },
            include: [
                {
                    model: models_1.RanchLocation,
                    as: "fromLocation",
                    attributes: ["public_id", "name", "code", "location_type"],
                    required: false,
                },
                {
                    model: models_1.RanchLocation,
                    as: "toLocation",
                    attributes: ["public_id", "name", "code", "location_type"],
                    required: false,
                },
            ],
            order: [["created_at", "DESC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Animal movements fetched successfully",
            data: {
                movements: rows.map((m) => ({
                    id: m.get("id"),
                    movementType: m.get("movement_type"),
                    fromLocation: m.fromLocation
                        ? {
                            id: m.fromLocation.get("public_id"),
                            name: m.fromLocation.get("name"),
                            code: m.fromLocation.get("code"),
                            locationType: m.fromLocation.get("location_type"),
                        }
                        : null,
                    toLocation: m.toLocation
                        ? {
                            id: m.toLocation.get("public_id"),
                            name: m.toLocation.get("name"),
                            code: m.toLocation.get("code"),
                            locationType: m.toLocation.get("location_type"),
                        }
                        : null,
                    notes: m.get("notes"),
                    createdAt: m.get("created_at"),
                })),
            },
        }));
    }
    catch (err) {
        console.error("LIST_ANIMAL_MOVEMENTS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list animal movements",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
