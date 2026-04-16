import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import { Animal, Species } from "../models";
import { errorResponse, successResponse } from "../utils/apiResponse";
import {
    createSpeciesSchema,
    updateSpeciesSchema,
} from "../validators/species.validator";
import { PLATFORM_ROLES } from "../constants/roles";

function isSuperAdmin(req: Request) {
    return req.user?.platformRole === PLATFORM_ROLES.SUPER_ADMIN;
}

function formatSpecies(species: any) {
    return {
        id: species.get("id"),
        name: species.get("name"),
        code: species.get("code"),
        createdAt: species.get("created_at"),
        updatedAt: species.get("updated_at"),
    };
}

export async function listSpecies(_req: Request, res: Response) {
    try {
        const rows = await Species.findAll({
            attributes: ["id", "name", "code", "created_at", "updated_at"],
            order: [["name", "ASC"]],
        } as any);

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Species fetched successfully",
                data: {
                    species: rows.map((row: any) => formatSpecies(row)),
                },
            })
        );
    } catch (err: any) {
        console.error("LIST_SPECIES_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to list species",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function createSpecies(req: Request, res: Response) {
    try {
        if (!isSuperAdmin(req)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only super admin can create species",
                })
            );
        }

        const parsed = createSpeciesSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid payload",
                    errors: parsed.error.issues,
                })
            );
        }

        const { name, code } = parsed.data;

        const existing = await Species.findOne({
            where: {
                [Op.or]: [{ name }, { code }],
            },
        } as any);

        if (existing) {
            if (existing.get("name") === name) {
                return res.status(StatusCodes.CONFLICT).json(
                    errorResponse({
                        message: "Species name already exists",
                    })
                );
            }

            if (existing.get("code") === code) {
                return res.status(StatusCodes.CONFLICT).json(
                    errorResponse({
                        message: "Species code already exists",
                    })
                );
            }
        }

        const species = await Species.create({
            name,
            code,
        } as any);

        return res.status(StatusCodes.CREATED).json(
            successResponse({
                message: "Species created successfully",
                data: {
                    species: formatSpecies(species),
                },
            })
        );
    } catch (err: any) {
        console.error("CREATE_SPECIES_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to create species",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function updateSpecies(req: Request, res: Response) {
    try {
        if (!isSuperAdmin(req)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only super admin can update species",
                })
            );
        }

        const parsed = updateSpeciesSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid payload",
                    errors: parsed.error.issues,
                })
            );
        }

        const speciesId = String(req.params.speciesId);

        const species = await Species.findByPk(speciesId);
        if (!species) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Species not found",
                })
            );
        }

        const { name, code } = parsed.data;

        if (name !== undefined) {
            const existingByName = await Species.findOne({
                where: {
                    name,
                    id: { [Op.ne]: speciesId },
                },
            } as any);

            if (existingByName) {
                return res.status(StatusCodes.CONFLICT).json(
                    errorResponse({
                        message: "Species name already exists",
                    })
                );
            }
        }

        if (code !== undefined) {
            const existingByCode = await Species.findOne({
                where: {
                    code,
                    id: { [Op.ne]: speciesId },
                },
            } as any);

            if (existingByCode) {
                return res.status(StatusCodes.CONFLICT).json(
                    errorResponse({
                        message: "Species code already exists",
                    })
                );
            }
        }

        await species.update({
            ...(name !== undefined ? { name } : {}),
            ...(code !== undefined ? { code } : {}),
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Species updated successfully",
                data: {
                    species: formatSpecies(species),
                },
            })
        );
    } catch (err: any) {
        console.error("UPDATE_SPECIES_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to update species",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function deleteSpecies(req: Request, res: Response) {
    try {
        if (!isSuperAdmin(req)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only super admin can delete species",
                })
            );
        }

        const speciesId = String(req.params.speciesId);

        const species = await Species.findByPk(speciesId);
        if (!species) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Species not found",
                })
            );
        }

        const animalsCount = await Animal.count({
            where: { species_id: speciesId },
        });

        if (animalsCount > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Cannot delete species that is already assigned to animals",
                })
            );
        }

        await species.destroy();

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Species deleted successfully",
            })
        );
    } catch (err: any) {
        console.error("DELETE_SPECIES_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to delete species",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}