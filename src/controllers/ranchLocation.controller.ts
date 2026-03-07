import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Ranch, RanchLocation } from "../models";
import {
    createRanchLocationSchema,
    updateRanchLocationSchema,
} from "../validators/ranchLocation.validator";

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