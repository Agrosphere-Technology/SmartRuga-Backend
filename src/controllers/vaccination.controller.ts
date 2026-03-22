import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import { Animal, Vaccination } from "../models";
import {
    createVaccinationSchema,
    deleteVaccinationSchema,
    updateVaccinationSchema,
} from "../validators/vaccination.validator";

function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function diffInDays(from: Date, to: Date) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay);
}

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
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
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
            updated_at: null,
            updated_by: null,
            deleted_at: null,
            deleted_by: null,
            delete_reason: null,
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
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const rows = await Vaccination.findAll({
            where: {
                ranch_id: ranchId,
                animal_id: animal.get("id"),
                deleted_at: null,
            },
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

export async function getAnimalVaccination(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { publicId, vaccinationPublicId } = req.params;

        const animal = await Animal.findOne({
            where: { public_id: publicId, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const vaccination = await Vaccination.findOne({
            where: {
                public_id: vaccinationPublicId,
                animal_id: animal.get("id"),
                ranch_id: ranchId,
                deleted_at: null,
            },
        } as any);

        if (!vaccination) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Vaccination not found",
            });
        }

        return res.status(StatusCodes.OK).json({
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
        console.error("GET_VACCINATION_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch vaccination",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function listVaccinationAlerts(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const dueSoonDays = Math.max(1, Number(req.query.dueSoonDays ?? 7));

        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const dueSoonEnd = endOfDay(addDays(now, dueSoonDays));

        const rows = await Vaccination.findAll({
            where: {
                ranch_id: ranchId,
                deleted_at: null,
                next_due_at: {
                    [Op.ne]: null,
                    [Op.lte]: dueSoonEnd,
                },
            },
            include: [
                {
                    model: Animal,
                    as: "animal",
                    attributes: ["public_id", "tag_number", "status", "breed", "sex"],
                    where: { ranch_id: ranchId },
                    required: true,
                },
            ],
            order: [["next_due_at", "ASC"]],
            limit: 200,
        } as any);

        const overdue: any[] = [];
        const dueToday: any[] = [];
        const dueSoon: any[] = [];

        for (const r of rows as any[]) {
            const animal = r.get("animal") as any;
            const nextDueAt = r.get("next_due_at") as Date | null;

            if (!nextDueAt) continue;

            const payload = {
                publicId: r.get("public_id"),
                animalPublicId: animal?.get("public_id") ?? null,
                animalTagNumber: animal?.get("tag_number") ?? null,
                animalStatus: animal?.get("status") ?? null,
                animalBreed: animal?.get("breed") ?? null,
                animalSex: animal?.get("sex") ?? null,
                vaccineName: r.get("vaccine_name"),
                dose: r.get("dose"),
                administeredAt: r.get("administered_at"),
                nextDueAt,
                notes: r.get("notes"),
            };

            if (nextDueAt < todayStart) {
                overdue.push({
                    ...payload,
                    daysOverdue: Math.abs(diffInDays(nextDueAt, now)),
                    alertStatus: "overdue",
                });
            } else if (nextDueAt >= todayStart && nextDueAt <= todayEnd) {
                dueToday.push({
                    ...payload,
                    daysUntilDue: 0,
                    alertStatus: "due_today",
                });
            } else if (nextDueAt > todayEnd && nextDueAt <= dueSoonEnd) {
                dueSoon.push({
                    ...payload,
                    daysUntilDue: diffInDays(now, nextDueAt),
                    alertStatus: "due_soon",
                });
            }
        }

        return res.status(StatusCodes.OK).json({
            summary: {
                overdueCount: overdue.length,
                dueTodayCount: dueToday.length,
                dueSoonCount: dueSoon.length,
                totalAlerts: overdue.length + dueToday.length + dueSoon.length,
                dueSoonWindowDays: dueSoonDays,
            },
            overdue,
            dueToday,
            dueSoon,
        });
    } catch (err: any) {
        console.error("LIST_VACCINATION_ALERTS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list vaccination alerts",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function updateAnimalVaccination(req: Request, res: Response) {
    try {
        const parsed = updateVaccinationSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }

        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const { publicId, vaccinationPublicId } = req.params;

        const animal = await Animal.findOne({
            where: { public_id: publicId, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const vaccination = await Vaccination.findOne({
            where: {
                public_id: vaccinationPublicId,
                animal_id: animal.get("id"),
                ranch_id: ranchId,
                deleted_at: null,
            },
        } as any);

        if (!vaccination) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Vaccination not found",
            });
        }

        const data = parsed.data;

        await vaccination.update({
            ...(data.vaccineName !== undefined && {
                vaccine_name: data.vaccineName,
            }),
            ...(data.dose !== undefined && {
                dose: data.dose,
            }),
            ...(data.administeredAt !== undefined && {
                administered_at: new Date(data.administeredAt),
            }),
            ...(data.nextDueAt !== undefined && {
                next_due_at: data.nextDueAt ? new Date(data.nextDueAt) : null,
            }),
            ...(data.notes !== undefined && {
                notes: data.notes,
            }),
            updated_at: new Date(),
            updated_by: userId,
        });

        return res.status(StatusCodes.OK).json({
            message: "Vaccination updated successfully",
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
        console.error("UPDATE_VACCINATION_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to update vaccination",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function deleteAnimalVaccination(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const { publicId, vaccinationPublicId } = req.params;

        const role = req.membership?.ranchRole;

        if (!role || !["owner", "manager", "vet"].includes(role)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Not allowed to delete vaccination",
            });
        }

        const parsed = deleteVaccinationSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }

        const animal = await Animal.findOne({
            where: { public_id: publicId, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Animal not found",
            });
        }

        const vaccination = await Vaccination.findOne({
            where: {
                public_id: vaccinationPublicId,
                animal_id: animal.get("id"),
                ranch_id: ranchId,
                deleted_at: null,
            },
        } as any);

        if (!vaccination) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Vaccination not found",
            });
        }

        await vaccination.update({
            deleted_at: new Date(),
            deleted_by: userId,
            delete_reason: parsed.data.reason ?? null,
            updated_at: new Date(),
            updated_by: userId,
        });

        return res.status(StatusCodes.OK).json({
            message: "Vaccination archived successfully",
        });
    } catch (err: any) {
        console.error("DELETE_VACCINATION_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to delete vaccination",
            error: err?.message ?? "Unknown error",
        });
    }
}