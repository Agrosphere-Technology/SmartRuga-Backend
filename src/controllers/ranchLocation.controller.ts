import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Animal, Ranch, RanchLocation, Species } from "../models";
import {
    createRanchLocationSchema,
    updateRanchLocationSchema,
} from "../validators/ranchLocation.validator";
import { col, fn } from "sequelize";
import { errorResponse, successResponse } from "../utils/apiResponse";

export async function createRanchLocation(req: Request, res: Response) {
    try {
        const parsed = createRanchLocationSchema.parse(req.body);
        const { slug } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Ranch not found",
                })
            );
        }

        const ranchId = ranch.get("id") as string;
        const name = parsed.name.trim();
        const code = parsed.code?.trim() || null;
        const description = parsed.description?.trim() || null;

        const existingByName = await RanchLocation.findOne({
            where: { ranch_id: ranchId, name },
        });

        if (existingByName) {
            return res.status(StatusCodes.CONFLICT).json(
                errorResponse({
                    message: "Location name already exists in this ranch",
                })
            );
        }

        if (code) {
            const existingByCode = await RanchLocation.findOne({
                where: { ranch_id: ranchId, code },
            });

            if (existingByCode) {
                return res.status(StatusCodes.CONFLICT).json(
                    errorResponse({
                        message: "Location code already exists in this ranch",
                    })
                );
            }
        }

        const location = await RanchLocation.create({
            ranch_id: ranchId,
            name,
            code,
            location_type: parsed.locationType,
            description,
            is_active: parsed.isActive ?? true,
        });

        return res.status(StatusCodes.CREATED).json(
            successResponse({
                message: "Ranch location created successfully",
                data: {
                    location,
                },
            })
        );
    } catch (error: any) {
        return res.status(StatusCodes.BAD_REQUEST).json(
            errorResponse({
                message: error?.issues ? "Invalid payload" : error.message || "Server error",
                errors: error?.issues || undefined,
            })
        );
    }
}

export async function listRanchLocations(req: Request, res: Response) {
    try {
        const { slug } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Ranch not found",
                })
            );
        }

        const ranchId = ranch.get("id") as string;

        const locations = await RanchLocation.findAll({
            where: { ranch_id: ranchId },
            order: [["name", "ASC"]],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Ranch locations fetched successfully",
                data: {
                    locations,
                },
            })
        );
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: error.message || "Server error",
            })
        );
    }
}

export async function getRanchLocationById(req: Request, res: Response) {
    try {
        const { slug, id } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Ranch not found",
                })
            );
        }

        const ranchId = ranch.get("id") as string;

        const location = await RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });

        if (!location) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Location not found",
                })
            );
        }

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Ranch location fetched successfully",
                data: {
                    location,
                },
            })
        );
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: error.message || "Server error",
            })
        );
    }
}

export async function updateRanchLocation(req: Request, res: Response) {
    try {
        const parsed = updateRanchLocationSchema.parse(req.body);
        const { slug, id } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Ranch not found",
                })
            );
        }

        const ranchId = ranch.get("id") as string;

        const location = await RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });

        if (!location) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Location not found",
                })
            );
        }

        if (parsed.name !== undefined) {
            const name = parsed.name.trim();

            const existingByName = await RanchLocation.findOne({
                where: { ranch_id: ranchId, name },
            });

            if (
                existingByName &&
                existingByName.get("public_id") !== location.get("public_id")
            ) {
                return res.status(StatusCodes.CONFLICT).json(
                    errorResponse({
                        message: "Location name already exists in this ranch",
                    })
                );
            }

            location.set("name", name);
        }

        if (parsed.code !== undefined) {
            const code = parsed.code?.trim() || null;

            if (code) {
                const existingByCode = await RanchLocation.findOne({
                    where: { ranch_id: ranchId, code },
                });

                if (
                    existingByCode &&
                    existingByCode.get("public_id") !== location.get("public_id")
                ) {
                    return res.status(StatusCodes.CONFLICT).json(
                        errorResponse({
                            message: "Location code already exists in this ranch",
                        })
                    );
                }
            }

            location.set("code", code);
        }

        if (parsed.locationType !== undefined) {
            location.set("location_type", parsed.locationType);
        }

        if (parsed.description !== undefined) {
            location.set("description", parsed.description?.trim() || null);
        }

        if (parsed.isActive !== undefined) {
            location.set("is_active", parsed.isActive);
        }

        await location.save();

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Ranch location updated successfully",
                data: {
                    location,
                },
            })
        );
    } catch (error: any) {
        return res.status(StatusCodes.BAD_REQUEST).json(
            errorResponse({
                message: error?.issues ? "Invalid payload" : error.message || "Server error",
                errors: error?.issues || undefined,
            })
        );
    }
}

// List Animals In a Location
export async function listAnimalsInLocation(req: Request, res: Response) {
    try {
        const { slug, id } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Ranch not found",
                })
            );
        }

        const ranchId = ranch.get("id") as string;

        const location = await RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });

        if (!location) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Location not found",
                })
            );
        }

        const animals = await Animal.findAll({
            where: {
                ranch_id: ranchId,
                current_location_id: location.get("id"),
            },
            include: [
                {
                    model: Species,
                    as: "species",
                    attributes: ["id", "name", "code"],
                    required: false,
                },
            ],
            order: [["created_at", "DESC"]],
        } as any);

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Animals in location fetched successfully",
                data: {
                    location: {
                        id: location.get("public_id"),
                        name: location.get("name"),
                        code: location.get("code"),
                        locationType: location.get("location_type"),
                        description: location.get("description"),
                        isActive: location.get("is_active"),
                    },
                    animalCount: animals.length,
                    animals: animals.map((animal: any) => ({
                        publicId: animal.get("public_id"),
                        tagNumber: animal.get("tag_number"),
                        rfidTag: animal.get("rfid_tag"),
                        sex: animal.get("sex"),
                        dateOfBirth: animal.get("date_of_birth"),
                        status: animal.get("status"),
                        species: animal.species
                            ? {
                                id: animal.species.get("id"),
                                name: animal.species.get("name"),
                                code: animal.species.get("code"),
                            }
                            : null,
                    })),
                },
            })
        );
    } catch (error: any) {
        console.error("LIST_ANIMALS_IN_LOCATION_ERROR:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to list animals in location",
                errors: error?.message ?? "Unknown error",
            })
        );
    }
}

// Ranch Locations Summary / Inventory
export async function getRanchLocationInventory(req: Request, res: Response) {
    try {
        const { slug } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Ranch not found",
                })
            );
        }

        const ranchId = ranch.get("id") as string;

        const locations = await RanchLocation.findAll({
            where: { ranch_id: ranchId },
            attributes: [
                "id",
                "public_id",
                "name",
                "code",
                "location_type",
                "description",
                "is_active",
                [fn("COUNT", col("animalsCurrentlyHere.id")), "animal_count"],
            ],
            include: [
                {
                    model: Animal,
                    as: "animalsCurrentlyHere",
                    attributes: [],
                    required: false,
                },
            ],
            group: [
                "RanchLocation.id",
                "RanchLocation.public_id",
                "RanchLocation.name",
                "RanchLocation.code",
                "RanchLocation.location_type",
                "RanchLocation.description",
                "RanchLocation.is_active",
            ],
            order: [["name", "ASC"]],
            subQuery: false,
        } as any);

        const totalAnimals = locations.reduce(
            (sum: number, location: any) =>
                sum + Number(location.get("animal_count") || 0),
            0
        );

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Ranch location inventory fetched successfully",
                data: {
                    totalLocations: locations.length,
                    totalAnimals,
                    locations: locations.map((location: any) => ({
                        id: location.get("public_id"),
                        name: location.get("name"),
                        code: location.get("code"),
                        locationType: location.get("location_type"),
                        description: location.get("description"),
                        isActive: location.get("is_active"),
                        animalCount: Number(location.get("animal_count") || 0),
                    })),
                },
            })
        );
    } catch (error: any) {
        console.error("GET_RANCH_LOCATION_INVENTORY_ERROR:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to get ranch inventory",
                errors: error?.message ?? "Unknown error",
            })
        );
    }
}