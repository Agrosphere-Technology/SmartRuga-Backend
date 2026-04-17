"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSpecies = listSpecies;
exports.createSpecies = createSpecies;
exports.updateSpecies = updateSpecies;
exports.deleteSpecies = deleteSpecies;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const apiResponse_1 = require("../utils/apiResponse");
const species_validator_1 = require("../validators/species.validator");
const roles_1 = require("../constants/roles");
function isSuperAdmin(req) {
    return req.user?.platformRole === roles_1.PLATFORM_ROLES.SUPER_ADMIN;
}
function formatSpecies(species) {
    return {
        id: species.get("id"),
        name: species.get("name"),
        code: species.get("code"),
        createdAt: species.get("created_at"),
        updatedAt: species.get("updated_at"),
    };
}
async function listSpecies(_req, res) {
    try {
        const rows = await models_1.Species.findAll({
            attributes: ["id", "name", "code", "created_at", "updated_at"],
            order: [["name", "ASC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Species fetched successfully",
            data: {
                species: rows.map((row) => formatSpecies(row)),
            },
        }));
    }
    catch (err) {
        console.error("LIST_SPECIES_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list species",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function createSpecies(req, res) {
    try {
        if (!isSuperAdmin(req)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only super admin can create species",
            }));
        }
        const parsed = species_validator_1.createSpeciesSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const { name, code } = parsed.data;
        const existing = await models_1.Species.findOne({
            where: {
                [sequelize_1.Op.or]: [{ name }, { code }],
            },
        });
        if (existing) {
            if (existing.get("name") === name) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                    message: "Species name already exists",
                }));
            }
            if (existing.get("code") === code) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                    message: "Species code already exists",
                }));
            }
        }
        const species = await models_1.Species.create({
            name,
            code,
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Species created successfully",
            data: {
                species: formatSpecies(species),
            },
        }));
    }
    catch (err) {
        console.error("CREATE_SPECIES_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to create species",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function updateSpecies(req, res) {
    try {
        if (!isSuperAdmin(req)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only super admin can update species",
            }));
        }
        const parsed = species_validator_1.updateSpeciesSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const speciesId = String(req.params.speciesId);
        const species = await models_1.Species.findByPk(speciesId);
        if (!species) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Species not found",
            }));
        }
        const { name, code } = parsed.data;
        if (name !== undefined) {
            const existingByName = await models_1.Species.findOne({
                where: {
                    name,
                    id: { [sequelize_1.Op.ne]: speciesId },
                },
            });
            if (existingByName) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                    message: "Species name already exists",
                }));
            }
        }
        if (code !== undefined) {
            const existingByCode = await models_1.Species.findOne({
                where: {
                    code,
                    id: { [sequelize_1.Op.ne]: speciesId },
                },
            });
            if (existingByCode) {
                return res.status(http_status_codes_1.StatusCodes.CONFLICT).json((0, apiResponse_1.errorResponse)({
                    message: "Species code already exists",
                }));
            }
        }
        await species.update({
            ...(name !== undefined ? { name } : {}),
            ...(code !== undefined ? { code } : {}),
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Species updated successfully",
            data: {
                species: formatSpecies(species),
            },
        }));
    }
    catch (err) {
        console.error("UPDATE_SPECIES_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to update species",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function deleteSpecies(req, res) {
    try {
        if (!isSuperAdmin(req)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only super admin can delete species",
            }));
        }
        const speciesId = String(req.params.speciesId);
        const species = await models_1.Species.findByPk(speciesId);
        if (!species) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Species not found",
            }));
        }
        const animalsCount = await models_1.Animal.count({
            where: { species_id: speciesId },
        });
        if (animalsCount > 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Cannot delete species that is already assigned to animals",
            }));
        }
        await species.destroy();
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Species deleted successfully",
        }));
    }
    catch (err) {
        console.error("DELETE_SPECIES_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to delete species",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
