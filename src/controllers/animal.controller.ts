import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  Animal,
  AnimalHealthEvent,
  AnimalActivityEvent,
  sequelize,
  Species,
} from "../models";
import { Op, QueryTypes } from "sequelize";
import { buildAnimalQrUrl } from "../utils/qr";
import { RANCH_ROLES } from "../constants/roles";
import {
  listAnimalsQuerySchema,
  updateAnimalSchema,
} from "../validators/animal.validator";
import {
  animalLookupSchema,
  bulkAnimalLookupSchema,
} from "../validators/animalLookup.validator";
import { createRanchAlert } from "../services/ranchAlert.service";

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

  return false;
}

function mapAnimalLookupResponse(animal: any) {
  return {
    publicId: animal.get("public_id"),
    tagNumber: animal.get("tag_number"),
    rfidTag: animal.get("rfid_tag"),
    sex: animal.get("sex"),
    dateOfBirth: animal.get("date_of_birth"),
    status: animal.get("status"),
    species: (animal as any).species
      ? {
        id: (animal as any).species.id,
        name: (animal as any).species.name,
        code: (animal as any).species.code ?? null,
      }
      : null,
  };
}

// Create Animal
export async function createAnimal(req: Request, res: Response) {
  try {
    const ranchId = req.ranch!.id;
    const requesterRole = req.membership!.ranchRole;

    if (
      requesterRole !== RANCH_ROLES.OWNER &&
      requesterRole !== RANCH_ROLES.MANAGER &&
      requesterRole !== RANCH_ROLES.VET
    ) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Not allowed to create animals" });
    }

    const { speciesId, tagNumber, rfidTag, sex, dateOfBirth } = req.body;

    const species = await Species.findByPk(speciesId);
    if (!species) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid species" });
    }

    if (tagNumber) {
      const normalizedTag = String(tagNumber).toUpperCase().trim();

      const dup = await Animal.findOne({
        where: { ranch_id: ranchId, tag_number: normalizedTag },
      });

      if (dup) {
        return res.status(StatusCodes.CONFLICT).json({
          message: "Tag number already exists in this ranch",
        });
      }
    }

    if (rfidTag) {
      const normalizedRfid = String(rfidTag).trim();

      const dupRfid = await Animal.findOne({
        where: { rfid_tag: normalizedRfid },
      });

      if (dupRfid) {
        return res.status(StatusCodes.CONFLICT).json({
          message: "RFID tag already exists",
        });
      }
    }

    const animal = await Animal.create({
      ranch_id: ranchId,
      species_id: speciesId,
      tag_number: tagNumber ? String(tagNumber).toUpperCase().trim() : null,
      rfid_tag: rfidTag ? String(rfidTag).trim() : null,
      sex,
      date_of_birth: dateOfBirth ?? null,
    });

    return res.status(StatusCodes.CREATED).json({
      id: animal.get("id") as string,
      publicId: animal.get("public_id"),
      rfidTag: animal.get("rfid_tag"),
      qrUrl: buildAnimalQrUrl(animal.get("public_id") as string),
    });
  } catch (err: any) {
    console.error("CREATE_ANIMAL_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to create animal",
      error: err?.message ?? "Unknown error",
    });
  }
}

// List Animals
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

    const sortColumn = sortBy === "tagNumber" ? "a.tag_number" : "a.created_at";
    const sortDir = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

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
      whereParts.push(`(
        a.tag_number ILIKE $${binds.length}
        OR a.rfid_tag ILIKE $${binds.length}
      )`);
    }
    if (healthStatus) {
      binds.push(healthStatus);
      whereParts.push(`COALESCE(h.status, 'healthy') = $${binds.length}`);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

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

    const animalById = new Map<string, any>();
    for (const a of animals) {
      const id = a.get("id") as string;
      animalById.set(id, a);
    }

    const ordered = animalIds.map((id) => animalById.get(id)).filter(Boolean);

    return res.status(StatusCodes.OK).json({
      animals: ordered.map((animal: any) => {
        const id = animal.get("id") as string;
        return {
          id,
          publicId: animal.get("public_id"),
          qrUrl: buildAnimalQrUrl(animal.get("public_id") as string),
          tagNumber: animal.get("tag_number"),
          rfidTag: animal.get("rfid_tag"),
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
      rfidTag: animal.get("rfid_tag"),
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
  const t = await sequelize.transaction();

  try {
    const parsed = updateAnimalSchema.safeParse(req.body);
    if (!parsed.success) {
      await t.rollback();
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid payload",
        issues: parsed.error.issues,
      });
    }

    const ranchId = req.ranch!.id;
    const { id } = req.params;
    const recorderId = req.user!.id;
    const animalId = String(req.params.id);

    const requesterRole = req.membership!.ranchRole;
    const canUpdate =
      requesterRole === RANCH_ROLES.OWNER ||
      requesterRole === RANCH_ROLES.MANAGER ||
      requesterRole === RANCH_ROLES.VET;

    if (!canUpdate) {
      await t.rollback();
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Not allowed to update animals" });
    }

    const animal = await Animal.findOne({
      where: { id, ranch_id: ranchId },
      transaction: t,
    } as any);

    if (!animal) {
      await t.rollback();
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
    }

    const {
      speciesId,
      tagNumber,
      rfidTag,
      sex,
      dateOfBirth,
      status,
      statusNotes,
    } = parsed.data as {
      speciesId?: string;
      tagNumber?: string | null;
      rfidTag?: string | null;
      sex?: "male" | "female" | "unknown";
      dateOfBirth?: string | null;
      status?: StatusEnum;
      statusNotes?: string | null;
    };

    if (speciesId) {
      const species = await Species.findByPk(speciesId, { transaction: t });
      if (!species) {
        await t.rollback();
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid species" });
      }
    }

    if (tagNumber !== undefined) {
      const normalized =
        tagNumber === null ? null : String(tagNumber).toUpperCase().trim();

      if (normalized) {
        const dup = await Animal.findOne({
          where: { ranch_id: ranchId, tag_number: normalized },
          transaction: t,
        } as any);

        if (dup && (dup.get("id") as string) !== (animal.get("id") as string)) {
          await t.rollback();
          return res.status(StatusCodes.CONFLICT).json({
            message: "Tag number already exists in this ranch",
          });
        }
      }
    }

    if (rfidTag !== undefined) {
      const normalizedRfid =
        rfidTag === null ? null : String(rfidTag).trim();

      if (normalizedRfid) {
        const dupRfid = await Animal.findOne({
          where: { rfid_tag: normalizedRfid },
          transaction: t,
        } as any);

        if (
          dupRfid &&
          (dupRfid.get("id") as string) !== (animal.get("id") as string)
        ) {
          await t.rollback();
          return res.status(StatusCodes.CONFLICT).json({
            message: "RFID tag already exists",
          });
        }
      }
    }

    const updates: any = {};
    if (speciesId !== undefined) updates.species_id = speciesId;
    if (tagNumber !== undefined) {
      updates.tag_number =
        tagNumber === null ? null : String(tagNumber).toUpperCase().trim();
    }
    if (rfidTag !== undefined) {
      updates.rfid_tag = rfidTag === null ? null : String(rfidTag).trim();
    }
    if (sex !== undefined) updates.sex = sex;
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;
    if (status !== undefined) updates.status = status;

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

    if (speciesId !== undefined) {
      pushIfChanged("species_id", animal.get("species_id"), updates.species_id);
    }

    if (tagNumber !== undefined) {
      pushIfChanged("tag_number", animal.get("tag_number"), updates.tag_number);
    }

    if (rfidTag !== undefined) {
      pushIfChanged("rfid_tag", animal.get("rfid_tag"), updates.rfid_tag);
    }

    if (sex !== undefined) {
      pushIfChanged("sex", animal.get("sex"), updates.sex);
    }

    if (dateOfBirth !== undefined) {
      pushIfChanged(
        "date_of_birth",
        animal.get("date_of_birth"),
        updates.date_of_birth
      );
    }

    const currentStatus = animal.get("status") as StatusEnum;

    if (status !== undefined && status !== null) {
      const nextStatus = status as StatusEnum;

      if (!canTransition(currentStatus, nextStatus)) {
        await t.rollback();
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Invalid status transition: ${currentStatus} -> ${nextStatus}`,
        });
      }

      const isChanging = currentStatus !== nextStatus;
      const requiresNote = nextStatus === "sold" || nextStatus === "deceased";

      if (isChanging && requiresNote) {
        const note = (statusNotes ?? "").toString().trim();
        if (!note) {
          await t.rollback();
          return res.status(StatusCodes.BAD_REQUEST).json({
            message: "statusNotes is required when status is sold or deceased",
          });
        }
      }

      if (isChanging) {
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
            transaction: t,
          }
        );

        pushIfChanged("status", currentStatus, nextStatus, notes);

        if (nextStatus === "sold" || nextStatus === "deceased") {
          const alertType =
            nextStatus === "sold" ? "status_sold" : "status_deceased";
          const tag = (animal.get("tag_number") as string) ?? "UN-TAGGED";
          const msg = `Animal ${tag} status changed: ${currentStatus} → ${nextStatus}. ${notes ?? ""}`.trim();

          await createRanchAlert({
            ranchId,
            animalId,
            alertType,
            message: msg,
            transaction: t,
          });
        }
      }
    }

    await animal.update(updates, { transaction: t });

    if (activityEvents.length > 0) {
      await AnimalActivityEvent.bulkCreate(activityEvents, { transaction: t });
    }

    await t.commit();

    return res.status(StatusCodes.OK).json({
      message: "Animal updated",
      animal: {
        id: animal.get("id") as string,
        publicId: animal.get("public_id"),
        tagNumber: animal.get("tag_number"),
        rfidTag: animal.get("rfid_tag"),
        sex: animal.get("sex"),
        dateOfBirth: animal.get("date_of_birth"),
        status: animal.get("status"),
        speciesId: animal.get("species_id"),
        updatedAt: animal.get("updated_at"),
      },
    });
  } catch (err: any) {
    await t.rollback();
    console.error("UPDATE_ANIMAL_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update animal",
      error: err?.message ?? "Unknown error",
      details: err?.errors ?? null,
    });
  }
}

// Single lookup by public_id, RFID tag, or tag number
export async function lookupAnimal(req: Request, res: Response) {
  try {
    const parsed = animalLookupSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid lookup query",
        issues: parsed.error.issues,
      });
    }

    const ranchId = req.ranch!.id;
    const identifier = parsed.data.identifier.trim();

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        identifier
      );

    const orConditions: any[] = [
      { rfid_tag: identifier },
      { tag_number: identifier },
    ];

    if (isUuid) {
      orConditions.unshift({ public_id: identifier });
    }

    const animal = await Animal.findOne({
      where: {
        ranch_id: ranchId,
        [Op.or]: orConditions,
      },
      include: [
        {
          model: Species,
          as: "species",
          attributes: ["id", "name", "code"],
          required: false,
        },
      ],
    } as any);

    if (!animal) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Animal not found",
      });
    }

    return res.status(StatusCodes.OK).json({
      animal: mapAnimalLookupResponse(animal),
    });
  } catch (err: any) {
    console.error("LOOKUP_ANIMAL_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to look up animal",
      error: err?.message ?? "Unknown error",
    });
  }
}

// Bulk lookup by public_id, RFID tag, or tag number
export async function bulkLookupAnimals(req: Request, res: Response) {
  try {
    const parsed = bulkAnimalLookupSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid payload",
        issues: parsed.error.issues,
      });
    }

    const ranchId = req.ranch!.id;
    const identifiers = parsed.data.identifiers.map((v) => v.trim());

    const uuidIdentifiers = identifiers.filter((identifier) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        identifier
      )
    );

    const orConditions: any[] = [
      { rfid_tag: { [Op.in]: identifiers } },
      { tag_number: { [Op.in]: identifiers } },
    ];

    if (uuidIdentifiers.length > 0) {
      orConditions.unshift({ public_id: { [Op.in]: uuidIdentifiers } });
    }

    const animals = await Animal.findAll({
      where: {
        ranch_id: ranchId,
        [Op.or]: orConditions,
      },
      include: [
        {
          model: Species,
          as: "species",
          attributes: ["id", "name", "code"],
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
          animal: mapAnimalLookupResponse(animal),
        });
      } else {
        notFound.push(identifier);
      }
    }

    return res.status(StatusCodes.OK).json({
      found,
      notFound,
    });
  } catch (err: any) {
    console.error("BULK_LOOKUP_ANIMALS_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to bulk look up animals",
      error: err?.message ?? "Unknown error",
    });
  }
}