import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Animal, AnimalHealthEvent, sequelize, Species } from "../models";
import { QueryTypes } from "sequelize";
import { buildAnimalQrUrl } from "../utils/qr";
import { RANCH_ROLES } from "../constants/roles";

type LatestHealthRow = {
  animal_id: string;
  status: string;
};

// Create Animals
export async function createAnimal(req: Request, res: Response) {
  try {
    const ranchId = req.ranch!.id;
    const requesterRole = req.membership!.ranchRole;

    // Only owner, manager, vet can create animals
    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER &&
      requesterRole !== RANCH_ROLES.VET
    ) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Not allowed to create animals" });
    }

    const { speciesId, tagNumber, sex, dateOfBirth } = req.body;

    // Ensure species exists
    const species = await Species.findByPk(speciesId);
    if (!species) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid species" });
    }

    // check if tagNumber already exists to avoid duplication

    if (tagNumber) {
      const dup = await Animal.findOne({
        where: { ranch_id: ranchId, tag_number: tagNumber },
      });

      if (dup) {
        return res.status(StatusCodes.CONFLICT).json({
          message: "Tag number already exists in this ranch",
        });
      }
    }

    const animal = await Animal.create({
      ranch_id: ranchId,
      species_id: speciesId,
      tag_number: tagNumber ?? null,
      sex,
      date_of_birth: dateOfBirth ?? null,
    });

    return res.status(StatusCodes.CREATED).json({
      id: animal.get("id"),
      publicId: animal.get("public_id"),
      qrUrl: buildAnimalQrUrl(animal.get("public_id") as string),
    });
  } catch (err: any) {
    console.error("CREATE_ANIMAL_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to create animal",
    });
  }
}

//  List Animals

export async function listAnimals(req: Request, res: Response) {
  try {
    const ranchId = req.ranch!.id;

    const animals = await Animal.findAll({
      where: { ranch_id: ranchId },
      include: [
        {
          model: Species,
          as: "species",
          attributes: ["id", "name", "code"],
        },
      ],
      order: [["created_at", "DESC"]],
    } as any);

    if (animals.length === 0) return res.json({ animals: [] });

    const animalIds = animals.map((a: any) => a.get("id") as string);

    const latestHealthRows = await sequelize.query<LatestHealthRow>(
      `
      SELECT DISTINCT ON (animal_id)
        animal_id,
        status
      FROM animal_health_events
      WHERE animal_id = ANY($1::uuid[])
      ORDER BY animal_id, created_at DESC
      `,
      {
        bind: [animalIds],
        type: QueryTypes.SELECT,
      }
    );

    const healthMap = new Map<string, string>();
    for (const row of latestHealthRows) {
      healthMap.set(row.animal_id, row.status);
    }

    return res.status(StatusCodes.OK).json({
      animals: animals.map((animal: any) => {
        const id = animal.get("id") as string;
        return {
          id,
          publicId: animal.get("public_id"),
          tagNumber: animal.get("tag_number"),
          sex: animal.get("sex"),
          status: animal.get("status"),
          healthStatus: healthMap.get(id) ?? "healthy",
          species: (animal as any).species,
        };
      }),
    });
  } catch (err: any) {
    console.error("LIST_ANIMALS_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to list animals",
      error: err?.message ?? "Unknown error",
    });
  }
}

// Get Animal By ID
export async function getAnimalById(req: Request, res: Response) {
  try {
    const ranchId = req.ranch!.id;
    const { id } = req.params;

    const animal = await Animal.findOne({
      where: { id, ranch_id: ranchId },
      include: [
        {
          model: Species,
          as: "species",
          attributes: ["id", "name", "code"],
        },
      ],
    } as any);

    if (!animal) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Animal not found" });
    }

    // ✅ latest health status
    const rows = await sequelize.query<{ status: string }>(
      `
        SELECT status
        FROM animal_health_events
        WHERE animal_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      {
        bind: [id],
        type: QueryTypes.SELECT,
      }
    );

    const healthStatus = rows[0]?.status ?? "healthy";

    return res.json({
      id: animal.get("id"),
      publicId: animal.get("public_id"),
      qrUrl: buildAnimalQrUrl(animal.get("public_id") as string),
      tagNumber: animal.get("tag_number"),
      sex: animal.get("sex"),
      dateOfBirth: animal.get("date_of_birth"),
      status: animal.get("status"),
      healthStatus,
      species: (animal as any).species,
      createdAt: animal.get("created_at"),
      updatedAt: animal.get("updated_at"),
    });
  } catch (err: any) {
    console.error("GET_ANIMAL_ERROR:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to fetch animal" });
  }
}
