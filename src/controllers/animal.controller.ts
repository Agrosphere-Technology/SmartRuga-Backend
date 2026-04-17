import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  Animal,
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
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../services/cloudinary.service";
import { errorResponse, successResponse } from "../utils/apiResponse";

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
    breed: animal.get("breed"),
    weight: animal.get("weight"),
    sex: animal.get("sex"),
    dateOfBirth: animal.get("date_of_birth"),
    status: animal.get("status"),
    imageUrl: animal.get("image_url"),
    imagePublicId: animal.get("image_public_id"),
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
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Not allowed to create animals",
        })
      );
    }

    const speciesId = req.body.speciesId;
    const tagNumber = req.body.tagNumber;
    const rfidTag = req.body.rfidTag;
    const sex = req.body.sex;
    const dateOfBirth = req.body.dateOfBirth;
    const breed = req.body.breed;
    const weight =
      req.body.weight !== undefined &&
        req.body.weight !== null &&
        String(req.body.weight).trim() !== ""
        ? Number(req.body.weight)
        : null;

    const species = await Species.findByPk(speciesId);
    if (!species) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid species",
        })
      );
    }

    if (tagNumber) {
      const normalizedTag = String(tagNumber).toUpperCase().trim();

      const dup = await Animal.findOne({
        where: { ranch_id: ranchId, tag_number: normalizedTag },
      });

      if (dup) {
        return res.status(StatusCodes.CONFLICT).json(
          errorResponse({
            message: "Tag number already exists in this ranch",
          })
        );
      }
    }

    if (rfidTag) {
      const normalizedRfid = String(rfidTag).trim();

      const dupRfid = await Animal.findOne({
        where: { rfid_tag: normalizedRfid },
      });

      if (dupRfid) {
        return res.status(StatusCodes.CONFLICT).json(
          errorResponse({
            message: "RFID tag already exists",
          })
        );
      }
    }

    const animal = await Animal.create({
      ranch_id: ranchId,
      species_id: speciesId,
      tag_number: tagNumber ? String(tagNumber).toUpperCase().trim() : null,
      rfid_tag: rfidTag ? String(rfidTag).trim() : null,
      sex,
      date_of_birth: dateOfBirth ?? null,
      breed: breed ?? null,
      weight,
      image_url: null,
      image_public_id: null,
    });

    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        `smartruga/animals/${ranchId}`,
        `animal-${animal.get("public_id")}`
      );

      await animal.update({
        image_url: uploadResult.secureUrl,
        image_public_id: uploadResult.publicId,
      });
    }

    return res.status(StatusCodes.CREATED).json(
      successResponse({
        message: "Animal created successfully",
        data: {
          animal: {
            id: animal.get("id") as string,
            publicId: animal.get("public_id"),
            tagNumber: animal.get("tag_number"),
            rfidTag: animal.get("rfid_tag"),
            speciesId: animal.get("species_id"),
            breed: animal.get("breed"),
            weight: animal.get("weight"),
            sex: animal.get("sex"),
            dateOfBirth: animal.get("date_of_birth"),
            status: animal.get("status"),
            imageUrl: animal.get("image_url"),
            imagePublicId: animal.get("image_public_id"),
            qrUrl: buildAnimalQrUrl(animal.get("public_id") as string),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("CREATE_ANIMAL_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to create animal",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// List Animals
export async function listAnimals(req: Request, res: Response) {
  try {
    const ranchId = req.ranch!.id;

    const parsed = listAnimalsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid query params",
          errors: parsed.error.issues,
        })
      );
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
      return res.status(StatusCodes.OK).json(
        successResponse({
          message: "Animals fetched successfully",
          data: {
            animals: [],
          },
          meta: {
            pagination: { page, limit, total, totalPages },
            filters: {
              speciesId: speciesId ?? null,
              status: status ?? null,
              sex: sex ?? null,
              healthStatus: healthStatus ?? null,
              q: q ?? null,
              sortBy,
              sortOrder,
            },
          },
        })
      );
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

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Animals fetched successfully",
        data: {
          animals: ordered.map((animal: any) => {
            const id = animal.get("id") as string;
            return {
              id,
              publicId: animal.get("public_id"),
              qrUrl: buildAnimalQrUrl(animal.get("public_id") as string),
              tagNumber: animal.get("tag_number"),
              rfidTag: animal.get("rfid_tag"),
              breed: animal.get("breed"),
              weight: animal.get("weight"),
              sex: animal.get("sex"),
              status: animal.get("status"),
              healthStatus: healthMap.get(id) ?? "healthy",
              imageUrl: animal.get("image_url"),
              imagePublicId: animal.get("image_public_id"),
              species: (animal as any).species,
              createdAt: animal.get("created_at"),
              updatedAt: animal.get("updated_at"),
            };
          }),
        },
        meta: {
          pagination: { page, limit, total, totalPages },
          filters: {
            speciesId: speciesId ?? null,
            status: status ?? null,
            sex: sex ?? null,
            healthStatus: healthStatus ?? null,
            q: q ?? null,
            sortBy,
            sortOrder,
          },
        },
      })
    );
  } catch (err: any) {
    console.error("LIST_ANIMALS_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to list animals",
        errors: err?.message ?? "Unknown error",
      })
    );
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
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Animal not found",
        })
      );
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
    const publicId = animal.get("public_id") as string;

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Animal fetched successfully",
        data: {
          animal: {
            id: animal.get("id") as string,
            publicId,
            qrUrl: buildAnimalQrUrl(publicId),
            tagNumber: animal.get("tag_number"),
            rfidTag: animal.get("rfid_tag"),
            breed: animal.get("breed"),
            weight: animal.get("weight"),
            sex: animal.get("sex"),
            dateOfBirth: animal.get("date_of_birth"),
            status: animal.get("status"),
            healthStatus,
            imageUrl: animal.get("image_url"),
            imagePublicId: animal.get("image_public_id"),
            species: (animal as any).species,
            createdAt: animal.get("created_at"),
            updatedAt: animal.get("updated_at"),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("GET_ANIMAL_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to fetch animal",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// Update Animal
export async function updateAnimal(req: Request, res: Response) {
  const t = await sequelize.transaction();

  try {
    const parsed = updateAnimalSchema.safeParse(req.body);
    if (!parsed.success) {
      await t.rollback();
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid payload",
          errors: parsed.error.issues,
        })
      );
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

    const canChangeStatus =
      requesterRole === RANCH_ROLES.OWNER ||
      requesterRole === RANCH_ROLES.MANAGER;

    if (!canUpdate) {
      await t.rollback();
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Not allowed to update animals",
        })
      );
    }

    const animal = await Animal.findOne({
      where: { id, ranch_id: ranchId },
      transaction: t,
    } as any);

    if (!animal) {
      await t.rollback();
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Animal not found",
        })
      );
    }

    const {
      speciesId,
      tagNumber,
      rfidTag,
      sex,
      dateOfBirth,
      breed,
      weight,
      status,
      statusNotes,
      imageUrl,
      imagePublicId,
    } = parsed.data as {
      speciesId?: string;
      tagNumber?: string | null;
      rfidTag?: string | null;
      sex?: "male" | "female" | "unknown";
      dateOfBirth?: string | null;
      breed?: string | null;
      weight?: number | null;
      status?: StatusEnum;
      statusNotes?: string | null;
      imageUrl?: string | null;
      imagePublicId?: string | null;
    };

    if (speciesId) {
      const species = await Species.findByPk(speciesId, { transaction: t });
      if (!species) {
        await t.rollback();
        return res.status(StatusCodes.BAD_REQUEST).json(
          errorResponse({
            message: "Invalid species",
          })
        );
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
          return res.status(StatusCodes.CONFLICT).json(
            errorResponse({
              message: "Tag number already exists in this ranch",
            })
          );
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
          return res.status(StatusCodes.CONFLICT).json(
            errorResponse({
              message: "RFID tag already exists",
            })
          );
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

    if (dateOfBirth !== undefined) {
      updates.date_of_birth = dateOfBirth;
    }

    if (breed !== undefined) {
      updates.breed = breed === null ? null : String(breed).trim();
    }

    if (weight !== undefined) {
      updates.weight = weight;
    }

    if (imageUrl !== undefined) {
      updates.image_url = imageUrl;
    }

    if (imagePublicId !== undefined) {
      updates.image_public_id = imagePublicId;
    }

    const activityEvents: any[] = [];

    const pushIfChanged = (
      field: string,
      fromVal: any,
      toVal: any,
      notes?: string | null
    ) => {
      const fromStr =
        fromVal === undefined || fromVal === null ? null : String(fromVal);
      const toStr =
        toVal === undefined || toVal === null ? null : String(toVal);

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

    if (breed !== undefined) {
      pushIfChanged("breed", animal.get("breed"), updates.breed);
    }

    if (weight !== undefined) {
      pushIfChanged("weight", animal.get("weight"), updates.weight);
    }

    if (imageUrl !== undefined) {
      pushIfChanged("image_url", animal.get("image_url"), updates.image_url);
    }

    if (imagePublicId !== undefined) {
      pushIfChanged(
        "image_public_id",
        animal.get("image_public_id"),
        updates.image_public_id
      );
    }

    const currentStatus = animal.get("status") as StatusEnum;

    if (status !== undefined && status !== null) {
      const nextStatus = status as StatusEnum;
      const isChanging = currentStatus !== nextStatus;

      if (isChanging && !canChangeStatus) {
        await t.rollback();
        return res.status(StatusCodes.FORBIDDEN).json(
          errorResponse({
            message: "Only owner or manager can change animal status",
          })
        );
      }

      if (!canTransition(currentStatus, nextStatus)) {
        await t.rollback();
        return res.status(StatusCodes.BAD_REQUEST).json(
          errorResponse({
            message: `Invalid status transition: ${currentStatus} -> ${nextStatus}`,
          })
        );
      }

      const requiresNote =
        nextStatus === "sold" || nextStatus === "deceased";

      if (isChanging && requiresNote) {
        const note = (statusNotes ?? "").toString().trim();
        if (!note) {
          await t.rollback();
          return res.status(StatusCodes.BAD_REQUEST).json(
            errorResponse({
              message: "statusNotes is required when status is sold or deceased",
            })
          );
        }
      }

      if (isChanging) {
        const notes = statusNotes ? String(statusNotes).trim() : null;

        updates.status = nextStatus;

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
            title: nextStatus === "sold" ? "Animal sold alert" : "Animal deceased alert",
            message: msg,
            priority: "high",
            entityType: "animal",
            entityPublicId: String(animal.get("public_id")),
            transaction: t,
            dedupe: true,
            dedupeMinutes: 60,
          });
        }
      }
    }

    await animal.update(updates, { transaction: t });

    if (activityEvents.length > 0) {
      await AnimalActivityEvent.bulkCreate(activityEvents, { transaction: t });
    }

    await t.commit();

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Animal updated successfully",
        data: {
          animal: {
            id: animal.get("id") as string,
            publicId: animal.get("public_id"),
            tagNumber: animal.get("tag_number"),
            rfidTag: animal.get("rfid_tag"),
            breed: animal.get("breed"),
            weight: animal.get("weight"),
            sex: animal.get("sex"),
            dateOfBirth: animal.get("date_of_birth"),
            status: animal.get("status"),
            speciesId: animal.get("species_id"),
            imageUrl: animal.get("image_url"),
            imagePublicId: animal.get("image_public_id"),
            updatedAt: animal.get("updated_at"),
          },
        },
      })
    );
  } catch (err: any) {
    await t.rollback();
    console.error("UPDATE_ANIMAL_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to update animal",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// Single lookup by public_id, RFID tag, or tag number
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
          animal: mapAnimalLookupResponse(animal),
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

// Bulk lookup by public_id, RFID tag, or tag number
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

export async function uploadAnimalImage(req: Request, res: Response) {
  try {
    const ranchId = req.ranch!.id;
    const { id } = req.params;
    const requesterRole = req.membership!.ranchRole;
    const recorderId = req.user!.id;

    const canUpdate =
      requesterRole === RANCH_ROLES.OWNER ||
      requesterRole === RANCH_ROLES.MANAGER ||
      requesterRole === RANCH_ROLES.VET;

    if (!canUpdate) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Not allowed to upload animal image",
        })
      );
    }

    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Image file is required",
        })
      );
    }

    const animal = await Animal.findOne({
      where: { id, ranch_id: ranchId },
    } as any);

    if (!animal) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Animal not found",
        })
      );
    }

    const oldImagePublicId = animal.get("image_public_id") as string | null;

    const uploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      `smartruga/animals/${ranchId}`,
      `animal-${animal.get("public_id")}`
    );

    if (oldImagePublicId && oldImagePublicId !== uploadResult.publicId) {
      await deleteFromCloudinary(oldImagePublicId);
    }

    const previousImageUrl = animal.get("image_url");
    const previousImagePublicId = animal.get("image_public_id");

    await animal.update({
      image_url: uploadResult.secureUrl,
      image_public_id: uploadResult.publicId,
    });

    const activityEvents: any[] = [];

    const pushIfChanged = (field: string, fromVal: any, toVal: any) => {
      const fromStr =
        fromVal === undefined || fromVal === null ? null : String(fromVal);
      const toStr =
        toVal === undefined || toVal === null ? null : String(toVal);

      if (fromStr !== toStr) {
        activityEvents.push({
          ranch_id: ranchId,
          animal_id: animal.get("id") as string,
          event_type: "animal_update",
          field,
          from_value: fromStr,
          to_value: toStr,
          notes: "Animal image updated",
          recorded_by: recorderId,
          created_at: new Date(),
        });
      }
    };

    pushIfChanged("image_url", previousImageUrl, uploadResult.secureUrl);
    pushIfChanged("image_public_id", previousImagePublicId, uploadResult.publicId);

    if (activityEvents.length > 0) {
      await AnimalActivityEvent.bulkCreate(activityEvents);
    }

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Animal image uploaded successfully",
        data: {
          animal: {
            id: animal.get("id"),
            publicId: animal.get("public_id"),
            imageUrl: animal.get("image_url"),
            imagePublicId: animal.get("image_public_id"),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("UPLOAD_ANIMAL_IMAGE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to upload animal image",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function removeAnimalImage(req: Request, res: Response) {
  try {
    const ranchId = req.ranch!.id;
    const { id } = req.params;
    const requesterRole = req.membership!.ranchRole;
    const recorderId = req.user!.id;

    const canUpdate =
      requesterRole === RANCH_ROLES.OWNER ||
      requesterRole === RANCH_ROLES.MANAGER ||
      requesterRole === RANCH_ROLES.VET;

    if (!canUpdate) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Not allowed to remove animal image",
        })
      );
    }

    const animal = await Animal.findOne({
      where: { id, ranch_id: ranchId },
    } as any);

    if (!animal) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Animal not found",
        })
      );
    }

    const oldImageUrl = animal.get("image_url") as string | null;
    const oldImagePublicId = animal.get("image_public_id") as string | null;

    if (!oldImageUrl && !oldImagePublicId) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Animal does not have an image",
        })
      );
    }

    if (oldImagePublicId) {
      await deleteFromCloudinary(oldImagePublicId);
    }

    await animal.update({
      image_url: null,
      image_public_id: null,
    });

    await AnimalActivityEvent.bulkCreate([
      {
        ranch_id: ranchId,
        animal_id: animal.get("id") as string,
        event_type: "animal_update",
        field: "image_url",
        from_value: oldImageUrl,
        to_value: null,
        notes: "Animal image removed",
        recorded_by: recorderId,
        created_at: new Date(),
      },
      {
        ranch_id: ranchId,
        animal_id: animal.get("id") as string,
        event_type: "animal_update",
        field: "image_public_id",
        from_value: oldImagePublicId,
        to_value: null,
        notes: "Animal image removed",
        recorded_by: recorderId,
        created_at: new Date(),
      },
    ]);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Animal image removed successfully",
        data: {
          animal: {
            id: animal.get("id"),
            publicId: animal.get("public_id"),
            imageUrl: animal.get("image_url"),
            imagePublicId: animal.get("image_public_id"),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("REMOVE_ANIMAL_IMAGE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to remove animal image",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}