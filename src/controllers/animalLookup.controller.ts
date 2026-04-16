import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { Animal, Species } from "../models";
import {
    animalLookupSchema,
    bulkAnimalLookupSchema,
} from "../validators/animalLookup.validator";
import { errorResponse, successResponse } from "../utils/apiResponse";

function mapAnimalResponse(animal: any) {
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

export async function lookupAnimal(req: Request, res: Response) {
    try {
        const parsed = animalLookupSchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid lookup query",
                    errors: parsed.error.issues,
                })
            );
        }

        const ranchId = req.ranch!.id;
        const identifier = parsed.data.identifier.trim();

        const animal = await Animal.findOne({
            where: {
                ranch_id: ranchId,
                [Op.or]: [
                    { public_id: identifier },
                    { rfid_tag: identifier },
                    { tag_number: identifier },
                ],
            },
            include: [
                {
                    model: Species,
                    as: "species",
                    attributes: ["id", "name"],
                    required: false,
                },
            ],
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Animal not found",
                })
            );
        }

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Animal looked up successfully",
                data: {
                    animal: mapAnimalResponse(animal),
                },
            })
        );
    } catch (err: any) {
        console.error("LOOKUP_ANIMAL_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to look up animal",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function bulkLookupAnimals(req: Request, res: Response) {
    try {
        const parsed = bulkAnimalLookupSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid payload",
                    errors: parsed.error.issues,
                })
            );
        }

        const ranchId = req.ranch!.id;
        const identifiers = parsed.data.identifiers.map((v) => v.trim());

        const animals = await Animal.findAll({
            where: {
                ranch_id: ranchId,
                [Op.or]: [
                    { public_id: { [Op.in]: identifiers } },
                    { rfid_tag: { [Op.in]: identifiers } },
                    { tag_number: { [Op.in]: identifiers } },
                ],
            },
            include: [
                {
                    model: Species,
                    as: "species",
                    attributes: ["id", "name"],
                    required: false,
                },
            ],
        } as any);

        const foundByIdentifier = new Map<string, any>();

        for (const animal of animals as any[]) {
            const publicId = animal.get("public_id");
            const rfidTag = animal.get("rfid_tag");
            const tagNumber = animal.get("tag_number");

            if (publicId) foundByIdentifier.set(publicId, animal);
            if (rfidTag) foundByIdentifier.set(rfidTag, animal);
            if (tagNumber) foundByIdentifier.set(tagNumber, animal);
        }

        const found: any[] = [];
        const notFound: string[] = [];

        for (const identifier of identifiers) {
            const animal = foundByIdentifier.get(identifier);

            if (animal) {
                found.push({
                    identifier,
                    animal: mapAnimalResponse(animal),
                });
            } else {
                notFound.push(identifier);
            }
        }

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Bulk animal lookup completed successfully",
                data: {
                    found,
                    notFound,
                },
            })
        );
    } catch (err: any) {
        console.error("BULK_LOOKUP_ANIMALS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to bulk look up animals",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}