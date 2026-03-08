import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Animal, Ranch, RanchLocation, Species } from "../models";
import {
    createRanchLocationSchema,
    updateRanchLocationSchema,
} from "../validators/ranchLocation.validator";
import { col, fn } from "sequelize";

export async function createRanchLocation(req: Request, res: Response) {
    try {
        const parsed = createRanchLocationSchema.parse(req.body);
        const { slug } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Ranch not found" });
        }

        const ranchId = ranch.get("id") as string;
        const name = parsed.name.trim();
        const code = parsed.code?.trim() || null;
        const description = parsed.description?.trim() || null;

        const existingByName = await RanchLocation.findOne({
            where: { ranch_id: ranchId, name },
        });

        if (existingByName) {
            return res.status(StatusCodes.CONFLICT).json({
                message: "Location name already exists in this ranch",
            });
        }

        if (code) {
            const existingByCode = await RanchLocation.findOne({
                where: { ranch_id: ranchId, code },
            });

            if (existingByCode) {
                return res.status(StatusCodes.CONFLICT).json({
                    message: "Location code already exists in this ranch",
                });
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

        return res.status(StatusCodes.CREATED).json({ location });
    } catch (error: any) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: error?.issues ? "Invalid payload" : error.message || "Server error",
            errors: error?.issues || undefined,
        });
    }
}

export async function listRanchLocations(req: Request, res: Response) {
    try {
        const { slug } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Ranch not found" });
        }

        const ranchId = ranch.get("id") as string;

        const locations = await RanchLocation.findAll({
            where: { ranch_id: ranchId },
            order: [["name", "ASC"]],
        });

        return res.status(StatusCodes.OK).json({ locations });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Server error",
        });
    }
}

export async function getRanchLocationById(req: Request, res: Response) {
    try {
        const { slug, id } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Ranch not found" });
        }

        const ranchId = ranch.get("id") as string;

        const location = await RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });

        if (!location) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Location not found" });
        }

        return res.status(StatusCodes.OK).json({ location });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Server error",
        });
    }
}

export async function updateRanchLocation(req: Request, res: Response) {
    try {
        const parsed = updateRanchLocationSchema.parse(req.body);
        const { slug, id } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Ranch not found" });
        }

        const ranchId = ranch.get("id") as string;

        const location = await RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });

        if (!location) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Location not found" });
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
                return res.status(StatusCodes.CONFLICT).json({
                    message: "Location name already exists in this ranch",
                });
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
                    return res.status(StatusCodes.CONFLICT).json({
                        message: "Location code already exists in this ranch",
                    });
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

        return res.status(StatusCodes.OK).json({ location });
    } catch (error: any) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: error?.issues ? "Invalid payload" : error.message || "Server error",
            errors: error?.issues || undefined,
        });
    }
}

// Lis Animals In a Location

export async function listAnimalsInLocation(req: Request, res: Response) {
    try {
        const { slug, id } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Ranch not found" });
        }

        const ranchId = ranch.get("id") as string;

        const location = await RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });

        if (!location) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Location not found" });
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

        return res.status(StatusCodes.OK).json({
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
        });
    } catch (error: any) {
        console.error("LIST_ANIMALS_IN_LOCATION_ERROR:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list animals in location",
            error: error?.message ?? "Unknown error",
        });
    }
}

// Ranch Locations Summary or Inventory

export async function getRanchInventory(req: Request, res: Response) {
    try {
        const { slug } = req.params;

        const ranch = await Ranch.findOne({ where: { slug } });

        if (!ranch) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Ranch not found" });
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

        return res.status(StatusCodes.OK).json({
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
        });
    } catch (error: any) {
        console.error("GET_RANCH_INVENTORY_ERROR:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to get ranch inventory",
            error: error?.message ?? "Unknown error",
        });
    }
}