import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { Animal, AnimalMovementEvent, RanchLocation } from "../models";
import { RANCH_ROLES } from "../constants/roles";
import { recordAnimalMovementSchema } from "../validators/animalMovement.validator";
import { errorResponse, successResponse } from "../utils/apiResponse";

export async function createAnimalMovement(req: Request, res: Response) {
    try {
        const requesterRole = req.membership!.ranchRole;

        const canRecordMovement =
            requesterRole === RANCH_ROLES.OWNER ||
            requesterRole === RANCH_ROLES.MANAGER ||
            requesterRole === RANCH_ROLES.VET ||
            requesterRole === RANCH_ROLES.WORKER;

        if (!canRecordMovement) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Not allowed to record animal movement",
                })
            );
        }

        const parsed = recordAnimalMovementSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid payload",
                    errors: parsed.error.issues,
                })
            );
        }

        const ranchId = req.ranch!.id;
        const recorderId = req.user!.id;
        const { id } = req.params;

        const animal = await Animal.findOne({
            where: { public_id: id, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Animal not found",
                })
            );
        }

        const { movementType, fromLocationId, toLocationId, notes } = parsed.data;

        let fromLocation: any = null;
        let toLocation: any = null;

        if (fromLocationId) {
            fromLocation = await RanchLocation.findOne({
                where: {
                    public_id: fromLocationId,
                    ranch_id: ranchId,
                },
            } as any);

            if (!fromLocation) {
                return res.status(StatusCodes.NOT_FOUND).json(
                    errorResponse({
                        message: "From location not found",
                    })
                );
            }
        }

        if (toLocationId) {
            toLocation = await RanchLocation.findOne({
                where: {
                    public_id: toLocationId,
                    ranch_id: ranchId,
                },
            } as any);

            if (!toLocation) {
                return res.status(StatusCodes.NOT_FOUND).json(
                    errorResponse({
                        message: "To location not found",
                    })
                );
            }
        }

        const movement = await AnimalMovementEvent.create({
            ranch_id: ranchId,
            animal_id: animal.get("id"),
            movement_type: movementType,
            from_location_id: fromLocation ? fromLocation.get("id") : null,
            to_location_id: toLocation ? toLocation.get("id") : null,
            notes: notes?.trim() || null,
            recorded_by: recorderId,
            created_at: new Date(),
        } as any);

        animal.set("current_location_id", toLocation ? toLocation.get("id") : null);
        await animal.save();

        return res.status(StatusCodes.CREATED).json(
            successResponse({
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
            })
        );
    } catch (err: any) {
        console.error("CREATE_ANIMAL_MOVEMENT_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to record animal movement",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function listAnimalMovements(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { id } = req.params;

        const animal = await Animal.findOne({
            where: { public_id: id, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Animal not found",
                })
            );
        }

        const rows = await AnimalMovementEvent.findAll({
            where: { ranch_id: ranchId, animal_id: animal.get("id") },
            include: [
                {
                    model: RanchLocation,
                    as: "fromLocation",
                    attributes: ["public_id", "name", "code", "location_type"],
                    required: false,
                },
                {
                    model: RanchLocation,
                    as: "toLocation",
                    attributes: ["public_id", "name", "code", "location_type"],
                    required: false,
                },
            ],
            order: [["created_at", "DESC"]],
        } as any);

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Animal movements fetched successfully",
                data: {
                    movements: rows.map((m: any) => ({
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
            })
        );
    } catch (err: any) {
        console.error("LIST_ANIMAL_MOVEMENTS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to list animal movements",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}