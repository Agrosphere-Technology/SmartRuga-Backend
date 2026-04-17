"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupAnimal = lookupAnimal;
exports.bulkLookupAnimals = bulkLookupAnimals;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const animalLookup_validator_1 = require("../validators/animalLookup.validator");
const apiResponse_1 = require("../utils/apiResponse");
function mapAnimalResponse(animal) {
    return {
        publicId: animal.get("public_id"),
        tagNumber: animal.get("tag_number"),
        rfidTag: animal.get("rfid_tag"),
        sex: animal.get("sex"),
        breed: animal.get("breed"),
        weight: animal.get("weight"),
        dateOfBirth: animal.get("date_of_birth"),
        status: animal.get("status"),
        species: animal.get("species")
            ? {
                id: animal.get("species").id,
                name: animal.get("species").name,
            }
            : null,
    };
}
async function lookupAnimal(req, res) {
    try {
        const parsed = animalLookup_validator_1.animalLookupSchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid lookup query",
                errors: parsed.error.issues,
            }));
        }
        const ranchId = req.ranch.id;
        const identifier = parsed.data.identifier.trim();
        const animal = await models_1.Animal.findOne({
            where: {
                ranch_id: ranchId,
                [sequelize_1.Op.or]: [
                    { public_id: identifier },
                    { rfid_tag: identifier },
                    { tag_number: identifier },
                ],
            },
            include: [
                {
                    model: models_1.Species,
                    as: "species",
                    attributes: ["id", "name"],
                    required: false,
                },
            ],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Animal looked up successfully",
            data: {
                animal: mapAnimalResponse(animal),
            },
        }));
    }
    catch (err) {
        console.error("LOOKUP_ANIMAL_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to look up animal",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function bulkLookupAnimals(req, res) {
    try {
        const parsed = animalLookup_validator_1.bulkAnimalLookupSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const ranchId = req.ranch.id;
        const identifiers = parsed.data.identifiers.map((v) => v.trim());
        const animals = await models_1.Animal.findAll({
            where: {
                ranch_id: ranchId,
                [sequelize_1.Op.or]: [
                    { public_id: { [sequelize_1.Op.in]: identifiers } },
                    { rfid_tag: { [sequelize_1.Op.in]: identifiers } },
                    { tag_number: { [sequelize_1.Op.in]: identifiers } },
                ],
            },
            include: [
                {
                    model: models_1.Species,
                    as: "species",
                    attributes: ["id", "name"],
                    required: false,
                },
            ],
        });
        const foundByIdentifier = new Map();
        for (const animal of animals) {
            const publicId = animal.get("public_id");
            const rfidTag = animal.get("rfid_tag");
            const tagNumber = animal.get("tag_number");
            if (publicId)
                foundByIdentifier.set(publicId, animal);
            if (rfidTag)
                foundByIdentifier.set(rfidTag, animal);
            if (tagNumber)
                foundByIdentifier.set(tagNumber, animal);
        }
        const found = [];
        const notFound = [];
        for (const identifier of identifiers) {
            const animal = foundByIdentifier.get(identifier);
            if (animal) {
                found.push({
                    identifier,
                    animal: mapAnimalResponse(animal),
                });
            }
            else {
                notFound.push(identifier);
            }
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Bulk animal lookup completed successfully",
            data: {
                found,
                notFound,
            },
        }));
    }
    catch (err) {
        console.error("BULK_LOOKUP_ANIMALS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to bulk look up animals",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
