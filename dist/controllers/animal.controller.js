"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnimal = createAnimal;
exports.listAnimals = listAnimals;
exports.getAnimalById = getAnimalById;
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const qr_1 = require("../utils/qr");
const roles_1 = require("../constants/roles");
// Create Animals
async function createAnimal(req, res) {
    try {
        const ranchId = req.ranch.id;
        const requesterRole = req.membership.ranchRole;
        // Only owner, manager, vet can create animals
        if (requesterRole !== roles_1.RANCH_ROLES.OWNER &&
            requesterRole !== roles_1.RANCH_ROLES.MANAGER &&
            requesterRole !== roles_1.RANCH_ROLES.VET) {
            return res
                .status(http_status_codes_1.StatusCodes.FORBIDDEN)
                .json({ message: "Not allowed to create animals" });
        }
        const { speciesId, tagNumber, sex, dateOfBirth } = req.body;
        // Ensure species exists
        const species = await models_1.Species.findByPk(speciesId);
        if (!species) {
            return res
                .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                .json({ message: "Invalid species" });
        }
        // check if tagNumber already exists to avoid duplication
        if (tagNumber) {
            const dup = await models_1.Animal.findOne({
                where: { ranch_id: ranchId, tag_number: tagNumber },
            });
            if (dup) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                    message: "Tag number already exists in this ranch",
                });
            }
        }
        const animal = await models_1.Animal.create({
            ranch_id: ranchId,
            species_id: speciesId,
            tag_number: tagNumber ?? null,
            sex,
            date_of_birth: dateOfBirth ?? null,
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
            id: animal.get("id"),
            publicId: animal.get("public_id"),
            qrUrl: (0, qr_1.buildAnimalQrUrl)(animal.get("public_id")),
        });
    }
    catch (err) {
        console.error("CREATE_ANIMAL_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to create animal",
        });
    }
}
//  List Animals
async function listAnimals(req, res) {
    try {
        const ranchId = req.ranch.id;
        const animals = await models_1.Animal.findAll({
            where: { ranch_id: ranchId },
            include: [
                {
                    model: models_1.Species,
                    as: "species",
                    attributes: ["id", "name", "code"],
                },
            ],
            order: [["created_at", "DESC"]],
        });
        if (animals.length === 0)
            return res.json({ animals: [] });
        const animalIds = animals.map((a) => a.get("id"));
        const latestHealthRows = await models_1.sequelize.query(`
      SELECT DISTINCT ON (animal_id)
        animal_id,
        status
      FROM animal_health_events
      WHERE animal_id = ANY($1::uuid[])
      ORDER BY animal_id, created_at DESC
      `, {
            bind: [animalIds],
            type: sequelize_1.QueryTypes.SELECT,
        });
        const healthMap = new Map();
        for (const row of latestHealthRows) {
            healthMap.set(row.animal_id, row.status);
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            animals: animals.map((animal) => {
                const id = animal.get("id");
                return {
                    id,
                    publicId: animal.get("public_id"),
                    tagNumber: animal.get("tag_number"),
                    sex: animal.get("sex"),
                    status: animal.get("status"),
                    healthStatus: healthMap.get(id) ?? "healthy",
                    species: animal.species,
                };
            }),
        });
    }
    catch (err) {
        console.error("LIST_ANIMALS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list animals",
            error: err?.message ?? "Unknown error",
        });
    }
}
// Get Animal By ID
async function getAnimalById(req, res) {
    try {
        const ranchId = req.ranch.id;
        const { id } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { id, ranch_id: ranchId },
            include: [
                {
                    model: models_1.Species,
                    as: "species",
                    attributes: ["id", "name", "code"],
                },
            ],
        });
        if (!animal) {
            return res
                .status(http_status_codes_1.StatusCodes.NOT_FOUND)
                .json({ message: "Animal not found" });
        }
        // ✅ latest health status
        const rows = await models_1.sequelize.query(`
        SELECT status
        FROM animal_health_events
        WHERE animal_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, {
            bind: [id],
            type: sequelize_1.QueryTypes.SELECT,
        });
        const healthStatus = rows[0]?.status ?? "healthy";
        return res.json({
            id: animal.get("id"),
            publicId: animal.get("public_id"),
            qrUrl: (0, qr_1.buildAnimalQrUrl)(animal.get("public_id")),
            tagNumber: animal.get("tag_number"),
            sex: animal.get("sex"),
            dateOfBirth: animal.get("date_of_birth"),
            status: animal.get("status"),
            healthStatus,
            species: animal.species,
            createdAt: animal.get("created_at"),
            updatedAt: animal.get("updated_at"),
        });
    }
    catch (err) {
        console.error("GET_ANIMAL_ERROR:", err);
        return res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ message: "Failed to fetch animal" });
    }
}
