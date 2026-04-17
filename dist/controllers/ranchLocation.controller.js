"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRanchLocation = createRanchLocation;
exports.listRanchLocations = listRanchLocations;
exports.getRanchLocationById = getRanchLocationById;
exports.updateRanchLocation = updateRanchLocation;
exports.listAnimalsInLocation = listAnimalsInLocation;
exports.getRanchLocationInventory = getRanchLocationInventory;
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
const ranchLocation_validator_1 = require("../validators/ranchLocation.validator");
const sequelize_1 = require("sequelize");
const apiResponse_1 = require("../utils/apiResponse");
async function createRanchLocation(req, res) {
    try {
        const parsed = ranchLocation_validator_1.createRanchLocationSchema.parse(req.body);
        const { slug } = req.params;
        const ranch = await models_1.Ranch.findOne({ where: { slug } });
        if (!ranch) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Ranch not found",
            }));
        }
        const ranchId = ranch.get("id");
        const name = parsed.name.trim();
        const code = parsed.code?.trim() || null;
        const description = parsed.description?.trim() || null;
        const existingByName = await models_1.RanchLocation.findOne({
            where: { ranch_id: ranchId, name },
        });
        if (existingByName) {
            return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                message: "Location name already exists in this ranch",
            }));
        }
        if (code) {
            const existingByCode = await models_1.RanchLocation.findOne({
                where: { ranch_id: ranchId, code },
            });
            if (existingByCode) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                    message: "Location code already exists in this ranch",
                }));
            }
        }
        const location = await models_1.RanchLocation.create({
            ranch_id: ranchId,
            name,
            code,
            location_type: parsed.locationType,
            description,
            is_active: parsed.isActive ?? true,
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Ranch location created successfully",
            data: {
                location,
            },
        }));
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
            message: error?.issues ? "Invalid payload" : error.message || "Server error",
            errors: error?.issues || undefined,
        }));
    }
}
async function listRanchLocations(req, res) {
    try {
        const { slug } = req.params;
        const ranch = await models_1.Ranch.findOne({ where: { slug } });
        if (!ranch) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Ranch not found",
            }));
        }
        const ranchId = ranch.get("id");
        const locations = await models_1.RanchLocation.findAll({
            where: { ranch_id: ranchId },
            order: [["name", "ASC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Ranch locations fetched successfully",
            data: {
                locations,
            },
        }));
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: error.message || "Server error",
        }));
    }
}
async function getRanchLocationById(req, res) {
    try {
        const { slug, id } = req.params;
        const ranch = await models_1.Ranch.findOne({ where: { slug } });
        if (!ranch) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Ranch not found",
            }));
        }
        const ranchId = ranch.get("id");
        const location = await models_1.RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });
        if (!location) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Location not found",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Ranch location fetched successfully",
            data: {
                location,
            },
        }));
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: error.message || "Server error",
        }));
    }
}
async function updateRanchLocation(req, res) {
    try {
        const parsed = ranchLocation_validator_1.updateRanchLocationSchema.parse(req.body);
        const { slug, id } = req.params;
        const ranch = await models_1.Ranch.findOne({ where: { slug } });
        if (!ranch) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Ranch not found",
            }));
        }
        const ranchId = ranch.get("id");
        const location = await models_1.RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });
        if (!location) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Location not found",
            }));
        }
        if (parsed.name !== undefined) {
            const name = parsed.name.trim();
            const existingByName = await models_1.RanchLocation.findOne({
                where: { ranch_id: ranchId, name },
            });
            if (existingByName &&
                existingByName.get("public_id") !== location.get("public_id")) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                    message: "Location name already exists in this ranch",
                }));
            }
            location.set("name", name);
        }
        if (parsed.code !== undefined) {
            const code = parsed.code?.trim() || null;
            if (code) {
                const existingByCode = await models_1.RanchLocation.findOne({
                    where: { ranch_id: ranchId, code },
                });
                if (existingByCode &&
                    existingByCode.get("public_id") !== location.get("public_id")) {
                    return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                        message: "Location code already exists in this ranch",
                    }));
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
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Ranch location updated successfully",
            data: {
                location,
            },
        }));
    }
    catch (error) {
        return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
            message: error?.issues ? "Invalid payload" : error.message || "Server error",
            errors: error?.issues || undefined,
        }));
    }
}
// List Animals In a Location
async function listAnimalsInLocation(req, res) {
    try {
        const { slug, id } = req.params;
        const ranch = await models_1.Ranch.findOne({ where: { slug } });
        if (!ranch) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Ranch not found",
            }));
        }
        const ranchId = ranch.get("id");
        const location = await models_1.RanchLocation.findOne({
            where: {
                ranch_id: ranchId,
                public_id: id,
            },
        });
        if (!location) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Location not found",
            }));
        }
        const animals = await models_1.Animal.findAll({
            where: {
                ranch_id: ranchId,
                current_location_id: location.get("id"),
            },
            include: [
                {
                    model: models_1.Species,
                    as: "species",
                    attributes: ["id", "name", "code"],
                    required: false,
                },
            ],
            order: [["created_at", "DESC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
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
                animals: animals.map((animal) => ({
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
        }));
    }
    catch (error) {
        console.error("LIST_ANIMALS_IN_LOCATION_ERROR:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list animals in location",
            errors: error?.message ?? "Unknown error",
        }));
    }
}
// Ranch Locations Summary / Inventory
async function getRanchLocationInventory(req, res) {
    try {
        const { slug } = req.params;
        const ranch = await models_1.Ranch.findOne({ where: { slug } });
        if (!ranch) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Ranch not found",
            }));
        }
        const ranchId = ranch.get("id");
        const locations = await models_1.RanchLocation.findAll({
            where: { ranch_id: ranchId },
            attributes: [
                "id",
                "public_id",
                "name",
                "code",
                "location_type",
                "description",
                "is_active",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("animalsCurrentlyHere.id")), "animal_count"],
            ],
            include: [
                {
                    model: models_1.Animal,
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
        });
        const totalAnimals = locations.reduce((sum, location) => sum + Number(location.get("animal_count") || 0), 0);
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Ranch location inventory fetched successfully",
            data: {
                totalLocations: locations.length,
                totalAnimals,
                locations: locations.map((location) => ({
                    id: location.get("public_id"),
                    name: location.get("name"),
                    code: location.get("code"),
                    locationType: location.get("location_type"),
                    description: location.get("description"),
                    isActive: location.get("is_active"),
                    animalCount: Number(location.get("animal_count") || 0),
                })),
            },
        }));
    }
    catch (error) {
        console.error("GET_RANCH_LOCATION_INVENTORY_ERROR:", error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to get ranch inventory",
            errors: error?.message ?? "Unknown error",
        }));
    }
}
