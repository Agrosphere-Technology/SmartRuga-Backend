import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Animal, AnimalHealthEvent, sequelize, Species } from "../models";
import { Op, QueryTypes } from "sequelize";
import { buildAnimalQrUrl } from "../utils/qr";
import { RANCH_ROLES } from "../constants/roles";
import z from "zod";

type LatestHealthRow = {
  animal_id: string;
  status: string;
};

const listAnimalsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // filters
  speciesId: z.string().uuid().optional(),
  status: z.enum(["active", "sold", "deceased"]).optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  healthStatus: z.enum(["healthy", "sick", "recovering", "quarantined"]).optional(),

  // search (tag)
  q: z.string().trim().min(1).max(100).optional(),

  // sort
  sortBy: z.enum(["createdAt", "tagNumber"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});


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

// query params validation

export async function listAnimals(req: Request, res: Response) {
  try {
    const ranchId = req.ranch!.id;

    const parsed = listAnimalsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid query params",
        issues: parsed.error.issues,
      });
    }

    const {
      page,
      limit,
      speciesId,
      status,
      sex,
      healthStatus,
      q,
      sortBy,
      sortOrder,
    } = parsed.data;

    const offset = (page - 1) * limit;

    // Map sortBy → DB column
    const sortColumn =
      sortBy === "tagNumber" ? "a.tag_number" : "a.created_at";
    const sortDir = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    /**
     * We use a LEFT JOIN LATERAL to fetch the latest health event per animal
     * and COALESCE to default to 'healthy' when there’s no record yet.
     *
     * This lets us filter by healthStatus WITHOUT pulling everything into JS.
     */
    const whereParts: string[] = [`a.ranch_id = $1`];
    const binds: any[] = [ranchId];

    if (speciesId) {
      binds.push(speciesId);
      whereParts.push(`a.species_id = $${binds.length}`);
    }
    if (status) {
      binds.push(status);
      whereParts.push(`a.status = $${binds.length}`);
    }
    if (sex) {
      binds.push(sex);
      whereParts.push(`a.sex = $${binds.length}`);
    }
    if (q) {
      binds.push(`%${q}%`);
      whereParts.push(`a.tag_number ILIKE $${binds.length}`);
    }
    if (healthStatus) {
      binds.push(healthStatus);
      whereParts.push(`COALESCE(h.status, 'healthy') = $${binds.length}`);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    // total count
    const countRows = await sequelize.query<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM animals a
      LEFT JOIN LATERAL (
        SELECT status
        FROM animal_health_events e
        WHERE e.animal_id = a.id
        ORDER BY e.created_at DESC
        LIMIT 1
      ) h ON true
      ${whereSql}
      `,
      { bind: binds, type: QueryTypes.SELECT }
    );

    const total = Number(countRows[0]?.total ?? "0");
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    if (total === 0) {
      return res.status(StatusCodes.OK).json({
        animals: [],
        pagination: { page, limit, total, totalPages },
      });
    }

    // page ids
    const idsRows = await sequelize.query<{ id: string }>(
      `
      SELECT a.id
      FROM animals a
      LEFT JOIN LATERAL (
        SELECT status
        FROM animal_health_events e
        WHERE e.animal_id = a.id
        ORDER BY e.created_at DESC
        LIMIT 1
      ) h ON true
      ${whereSql}
      ORDER BY ${sortColumn} ${sortDir}, a.id ${sortDir}
      LIMIT ${limit} OFFSET ${offset}
      `,
      { bind: binds, type: QueryTypes.SELECT }
    );

    const animalIds = idsRows.map((r) => r.id);

    // fetch animals + species using Sequelize
    const animals = await Animal.findAll({
      where: { id: { [Op.in]: animalIds } },
      include: [
        { model: Species, as: "species", attributes: ["id", "name", "code"] },
      ],
    } as any);

    const healthRows = await sequelize.query<LatestHealthRow>(
      `
        SELECT
          a.id AS animal_id,
          COALESCE(h.status, 'healthy') AS status
        FROM animals a
        LEFT JOIN LATERAL (
          SELECT status
          FROM animal_health_events e
          WHERE e.animal_id = a.id
          ORDER BY e.created_at DESC
          LIMIT 1
        ) h ON true
        WHERE a.id = ANY($1::uuid[])
      `,
      { bind: [animalIds], type: QueryTypes.SELECT }
    );

    const healthMap = new Map<string, string>();
    for (const r of healthRows) {
      healthMap.set(r.animal_id, r.status ?? "healthy");
    }

    // preserve pagination order
    const animalById = new Map<string, any>();
    // for (const a of animals) animalById.set(a.get("id"), a);
    for (const a of animals) {
      const id = a.get("id") as string;
      animalById.set(id, a);
    }

    const ordered = animalIds
      .map((id) => animalById.get(id))
      .filter(Boolean);

    return res.status(StatusCodes.OK).json({
      animals: ordered.map((animal: any) => {
        const id = animal.get("id") as string;
        return {
          id,
          publicId: animal.get("public_id"),
          qrUrl: buildAnimalQrUrl(animal.get("public_id") as string),
          tagNumber: animal.get("tag_number"),
          sex: animal.get("sex"),
          status: animal.get("status"),
          healthStatus: healthMap.get(id) ?? "healthy",
          species: (animal as any).species,
          createdAt: animal.get("created_at"),
          updatedAt: animal.get("updated_at"),
        };
      }),
      pagination: { page, limit, total, totalPages },
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
