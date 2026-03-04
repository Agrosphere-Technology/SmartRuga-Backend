import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Animal, Vaccination } from "../models";
import { createVaccinationSchema } from "../validators/vaccination.validator";
import { Op } from "sequelize";

export async function createAnimalVaccination(req: Request, res: Response) {
    try {
        const parsed = createVaccinationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }

        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const animalPublicId = req.params.publicId;

        const animal = await Animal.findOne({
            where: { public_id: animalPublicId, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
        }

        const v = parsed.data;

        const vaccination = await Vaccination.create({
            ranch_id: ranchId,
            animal_id: animal.get("id"),
            vaccine_name: v.vaccineName,
            dose: v.dose ?? null,
            administered_at: v.administeredAt ? new Date(v.administeredAt) : new Date(),
            next_due_at: v.nextDueAt ? new Date(v.nextDueAt) : null,
            administered_by: userId,
            notes: v.notes ?? null,
            created_at: new Date(),
        } as any);

        return res.status(StatusCodes.CREATED).json({
            vaccination: {
                publicId: vaccination.get("public_id"),
                vaccineName: vaccination.get("vaccine_name"),
                dose: vaccination.get("dose"),
                administeredAt: vaccination.get("administered_at"),
                nextDueAt: vaccination.get("next_due_at"),
                notes: vaccination.get("notes"),
            },
        });
    } catch (err: any) {
        console.error("CREATE_VACCINATION_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to create vaccination",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function listAnimalVaccinations(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const animalPublicId = req.params.publicId;

        const animal = await Animal.findOne({
            where: { public_id: animalPublicId, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
        }

        const rows = await Vaccination.findAll({
            where: { ranch_id: ranchId, animal_id: animal.get("id") },
            order: [["administered_at", "DESC"]],
        } as any);

        return res.status(StatusCodes.OK).json({
            vaccinations: rows.map((r: any) => ({
                publicId: r.get("public_id"),
                vaccineName: r.get("vaccine_name"),
                dose: r.get("dose"),
                administeredAt: r.get("administered_at"),
                nextDueAt: r.get("next_due_at"),
                notes: r.get("notes"),
            })),
        });
    } catch (err: any) {
        console.error("LIST_VACCINATIONS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list vaccinations",
            error: err?.message ?? "Unknown error",
        });
    }
}

// List overdue vaccinations for a ranch
export async function listOverdueVaccinations(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const now = new Date();

        const rows = await Vaccination.findAll({
            where: {
                ranch_id: ranchId,
                next_due_at: {
                    [Op.ne]: null,
                    [Op.lt]: now,
                },
            },
            include: [
                {
                    model: Animal,
                    as: "animal",
                    attributes: ["public_id", "tag_number", "status"],
                    where: { ranch_id: ranchId }, // safety
                    required: true,
                },
            ],
            order: [["next_due_at", "ASC"]],
            limit: 200,
        } as any);

        return res.status(StatusCodes.OK).json({
            overdue: rows.map((r: any) => ({
                publicId: r.get("public_id"),
                animalPublicId: r.get("animal")?.public_id,
                animalTagNumber: r.get("animal")?.tag_number ?? null,
                animalStatus: r.get("animal")?.status,
                vaccineName: r.get("vaccine_name"),
                nextDueAt: r.get("next_due_at"),
            })),
        });
    } catch (err: any) {
        console.error("LIST_OVERDUE_VACCINATIONS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list overdue vaccinations",
            error: err?.message ?? "Unknown error",
        });
    }
}
