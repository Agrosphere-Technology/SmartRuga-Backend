import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Animal, AnimalHealthEvent, sequelize, Species } from "../models";
import { Op, QueryTypes } from "sequelize";
import { buildAnimalQrUrl } from "../utils/qr";
import { RANCH_ROLES } from "../constants/roles";
import { listAnimalsQuerySchema, updateAnimalSchema } from "../validators/animal.validator";
import { AnimalActivityEvent } from "../models";

type LatestHealthRow = {
  animal_id: string;
  status: string;
};

type StatusEnum = "active" | "sold" | "deceased";

type InsertedStatusEventRow = {
  id: string;
  animal_id: string;
  from_status: StatusEnum;
  to_status: StatusEnum;
  notes: string | null;
  recorded_by: string;
  created_at: Date;
};

function canTransition(from: StatusEnum, to: StatusEnum) {
  if (from === to) return true;
  if (from === "active" && (to === "sold" || to === "deceased")) return true;

  // disallow re-activating sold/deceased unless you later decide otherwise
  return false;
}

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
      id: animal.get("id") as string,
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
      id: animal.get("id") as string,
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

// Update Animal

export async function updateAnimal(req: Request, res: Response) {
  try {
    const parsed = updateAnimalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid payload",
        issues: parsed.error.issues,
      });
    }

    const ranchId = req.ranch!.id;
    const { id } = req.params;
    const recorderId = req.user!.id;

    const requesterRole = req.membership!.ranchRole;
    const canUpdate =
      requesterRole === RANCH_ROLES.OWNER ||
      requesterRole === RANCH_ROLES.MANAGER ||
      requesterRole === RANCH_ROLES.VET;

    if (!canUpdate) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Not allowed to update animals" });
    }

    const animal = await Animal.findOne({
      where: { id, ranch_id: ranchId },
    } as any);

    if (!animal) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Animal not found" });
    }

    // ✅ include optional statusNotes in your schema (see note below)
    const { speciesId, tagNumber, sex, dateOfBirth, status, statusNotes } =
      parsed.data as any;

    // ✅ If speciesId provided, must exist
    if (speciesId) {
      const species = await Species.findByPk(speciesId);
      if (!species) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Invalid species" });
      }
    }

    // ✅ If tagNumber provided, prevent duplicates in same ranch (excluding this animal)
    if (tagNumber !== undefined) {
      const normalized =
        tagNumber === null ? null : String(tagNumber).toUpperCase().trim();

      if (normalized) {
        const dup = await Animal.findOne({
          where: { ranch_id: ranchId, tag_number: normalized },
        } as any);

        if (dup && (dup.get("id") as string) !== (animal.get("id") as string)) {
          return res.status(StatusCodes.CONFLICT).json({
            message: "Tag number already exists in this ranch",
          });
        }
      }
    }

    // ✅ Status transition + event logging
    const currentStatus = animal.get("status") as StatusEnum;

    if (status !== undefined && status !== null) {
      const nextStatus = status as StatusEnum;

      // validate transition
      if (!canTransition(currentStatus, nextStatus)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Invalid status transition: ${currentStatus} -> ${nextStatus}`,
        });
      }

      // require note for sold/deceased transitions (only when changing)
      const isChanging = currentStatus !== nextStatus;
      const requiresNote = nextStatus === "sold" || nextStatus === "deceased";

      if (isChanging && requiresNote) {
        const note = (statusNotes ?? "").toString().trim();
        if (!note) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            message: "statusNotes is required when status is sold or deceased",
          });
        }
      }

      // if changing, insert status event row
      if (currentStatus !== nextStatus) {
        const recorderId = req.user!.id;
        const notes = statusNotes ? String(statusNotes).trim() : null;

        await sequelize.query<InsertedStatusEventRow>(
          `
            INSERT INTO animal_status_events
              (id, animal_id, from_status, to_status, notes, recorded_by, created_at)
            VALUES
              (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
            RETURNING id, animal_id, from_status, to_status, notes, recorded_by, created_at
          `,
          {
            bind: [id, currentStatus, nextStatus, notes, recorderId],
            type: QueryTypes.SELECT,
          }
        );
      }
    }



    const updates: any = {};
    if (speciesId !== undefined) updates.species_id = speciesId;
    if (tagNumber !== undefined)
      updates.tag_number =
        tagNumber === null ? null : String(tagNumber).toUpperCase().trim();
    if (sex !== undefined) updates.sex = sex;
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;
    if (status !== undefined) updates.status = status;

    // 🔥 Build activity audit events (Sprint 3)
    const activityEvents: any[] = [];

    const pushIfChanged = (
      field: string,
      fromVal: any,
      toVal: any,
      notes?: string | null
    ) => {
      const fromStr = fromVal === undefined || fromVal === null ? null : String(fromVal);
      const toStr = toVal === undefined || toVal === null ? null : String(toVal);

      if (fromStr !== toStr) {
        activityEvents.push({
          ranch_id: ranchId,
          animal_id: animal.get("id") as string,
          event_type: "animal_update",
          field,
          from_value: fromStr,
          to_value: toStr,
          notes: notes ?? null,
          recorded_by: recorderId,
          created_at: new Date(),
        });
      }
    };

    // Compare CURRENT vs NEXT values
    if (speciesId !== undefined)
      pushIfChanged("species_id", animal.get("species_id"), updates.species_id);

    if (tagNumber !== undefined)
      pushIfChanged("tag_number", animal.get("tag_number"), updates.tag_number);

    if (sex !== undefined)
      pushIfChanged("sex", animal.get("sex"), updates.sex);

    if (dateOfBirth !== undefined)
      pushIfChanged("date_of_birth", animal.get("date_of_birth"), updates.date_of_birth);

    if (status !== undefined)
      pushIfChanged("status", animal.get("status"), updates.status, statusNotes ?? null);


    await animal.update(updates);

    if (activityEvents.length > 0) {
      await AnimalActivityEvent.bulkCreate(activityEvents);
    }

    return res.status(StatusCodes.OK).json({
      message: "Animal updated",
      animal: {
        id: animal.get("id") as string,
        publicId: animal.get("public_id"),
        tagNumber: animal.get("tag_number"),
        sex: animal.get("sex"),
        dateOfBirth: animal.get("date_of_birth"),
        status: animal.get("status"),
        speciesId: animal.get("species_id"),
        updatedAt: animal.get("updated_at"),
      },
    });
  } catch (err: any) {
    console.error("UPDATE_ANIMAL_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update animal",
      error: err?.message ?? "Unknown error",
      details: err?.errors ?? null,
    });
  }
}