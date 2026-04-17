"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnimalVaccination = createAnimalVaccination;
exports.listAnimalVaccinations = listAnimalVaccinations;
exports.getAnimalVaccination = getAnimalVaccination;
exports.listVaccinationAlerts = listVaccinationAlerts;
exports.updateAnimalVaccination = updateAnimalVaccination;
exports.deleteAnimalVaccination = deleteAnimalVaccination;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const vaccination_validator_1 = require("../validators/vaccination.validator");
const ranchAlert_service_1 = require("../services/ranchAlert.service");
const roles_1 = require("../constants/roles");
const apiResponse_1 = require("../utils/apiResponse");
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
function diffInDays(from, to) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay);
}
function canManageVaccinations(role) {
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
function canViewVaccinations(role) {
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
async function createAnimalVaccination(req, res) {
    try {
        const role = req.membership?.ranchRole;
        if (!canManageVaccinations(role)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Not allowed to create vaccination",
            }));
        }
        const parsed = vaccination_validator_1.createVaccinationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const animalPublicId = req.params.publicId;
        const animal = await models_1.Animal.findOne({
            where: { public_id: animalPublicId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const v = parsed.data;
        const vaccination = await models_1.Vaccination.create({
            ranch_id: ranchId,
            animal_id: animal.get("id"),
            vaccine_name: v.vaccineName,
            dose: v.dose ?? null,
            administered_at: v.administeredAt ? new Date(v.administeredAt) : new Date(),
            next_due_at: v.nextDueAt ? new Date(v.nextDueAt) : null,
            administered_by: userId,
            notes: v.notes ?? null,
            created_at: new Date(),
            deleted_at: null,
            deleted_by: null,
            delete_reason: null,
        });
        const nextDueAt = vaccination.get("next_due_at");
        if (nextDueAt && nextDueAt < new Date()) {
            await (0, ranchAlert_service_1.createRanchAlert)({
                ranchId,
                animalId: String(animal.get("id")),
                alertType: "vaccination_overdue",
                title: "Vaccination overdue alert",
                message: `${vaccination.get("vaccine_name")} for animal ${animal.get("tag_number")} is overdue`,
                priority: "high",
                entityType: "vaccination",
                entityPublicId: String(vaccination.get("public_id")),
                dedupe: true,
                dedupeMinutes: 1440,
            });
        }
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Vaccination created successfully",
            data: {
                vaccination: {
                    publicId: vaccination.get("public_id"),
                    vaccineName: vaccination.get("vaccine_name"),
                    dose: vaccination.get("dose"),
                    administeredAt: vaccination.get("administered_at"),
                    nextDueAt: vaccination.get("next_due_at"),
                    notes: vaccination.get("notes"),
                },
            },
        }));
    }
    catch (err) {
        console.error("CREATE_VACCINATION_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to create vaccination",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function listAnimalVaccinations(req, res) {
    try {
        const role = req.membership?.ranchRole;
        if (!canViewVaccinations(role)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Not allowed to view vaccinations",
            }));
        }
        const ranchId = req.ranch.id;
        const animalPublicId = req.params.publicId;
        const animal = await models_1.Animal.findOne({
            where: { public_id: animalPublicId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const rows = await models_1.Vaccination.findAll({
            where: {
                ranch_id: ranchId,
                animal_id: animal.get("id"),
                deleted_at: null,
            },
            order: [["administered_at", "DESC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Vaccinations fetched successfully",
            data: {
                animal: {
                    publicId: animal.get("public_id"),
                    tagNumber: animal.get("tag_number"),
                },
                vaccinations: rows.map((r) => ({
                    publicId: r.get("public_id"),
                    vaccineName: r.get("vaccine_name"),
                    dose: r.get("dose"),
                    administeredAt: r.get("administered_at"),
                    nextDueAt: r.get("next_due_at"),
                    notes: r.get("notes"),
                })),
            },
        }));
    }
    catch (err) {
        console.error("LIST_VACCINATIONS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list vaccinations",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function getAnimalVaccination(req, res) {
    try {
        const role = req.membership?.ranchRole;
        if (!canViewVaccinations(role)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Not allowed to view vaccination",
            }));
        }
        const ranchId = req.ranch.id;
        const { publicId, vaccinationPublicId } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { public_id: publicId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const vaccination = await models_1.Vaccination.findOne({
            where: {
                public_id: vaccinationPublicId,
                animal_id: animal.get("id"),
                ranch_id: ranchId,
                deleted_at: null,
            },
        });
        if (!vaccination) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Vaccination not found",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Vaccination fetched successfully",
            data: {
                vaccination: {
                    publicId: vaccination.get("public_id"),
                    vaccineName: vaccination.get("vaccine_name"),
                    dose: vaccination.get("dose"),
                    administeredAt: vaccination.get("administered_at"),
                    nextDueAt: vaccination.get("next_due_at"),
                    notes: vaccination.get("notes"),
                },
            },
        }));
    }
    catch (err) {
        console.error("GET_VACCINATION_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch vaccination",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function listVaccinationAlerts(req, res) {
    try {
        const role = req.membership?.ranchRole;
        if (!canViewVaccinations(role)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Not allowed to view vaccination alerts",
            }));
        }
        const ranchId = req.ranch.id;
        const rawDueSoonDays = Number(req.query.dueSoonDays ?? 7);
        const dueSoonDays = Math.min(30, Math.max(1, rawDueSoonDays || 7));
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const dueSoonEnd = endOfDay(addDays(now, dueSoonDays));
        const rows = await models_1.Vaccination.findAll({
            where: {
                ranch_id: ranchId,
                deleted_at: null,
                next_due_at: {
                    [sequelize_1.Op.ne]: null,
                    [sequelize_1.Op.lte]: dueSoonEnd,
                },
            },
            include: [
                {
                    model: models_1.Animal,
                    as: "animal",
                    attributes: ["public_id", "tag_number", "status", "breed", "sex"],
                    where: { ranch_id: ranchId },
                    required: true,
                },
            ],
            order: [["next_due_at", "ASC"]],
            limit: 200,
        });
        const overdue = [];
        const dueToday = [];
        const dueSoon = [];
        for (const r of rows) {
            const animal = r.get("animal");
            const nextDueAt = r.get("next_due_at");
            if (!nextDueAt)
                continue;
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
            }
            else if (nextDueAt >= todayStart && nextDueAt <= todayEnd) {
                dueToday.push({
                    ...payload,
                    daysUntilDue: 0,
                    alertStatus: "due_today",
                });
            }
            else if (nextDueAt > todayEnd && nextDueAt <= dueSoonEnd) {
                dueSoon.push({
                    ...payload,
                    daysUntilDue: diffInDays(now, nextDueAt),
                    alertStatus: "due_soon",
                });
            }
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Vaccination alerts fetched successfully",
            data: {
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
            },
        }));
    }
    catch (err) {
        console.error("LIST_VACCINATION_ALERTS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list vaccination alerts",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function updateAnimalVaccination(req, res) {
    try {
        const role = req.membership?.ranchRole;
        if (!canManageVaccinations(role)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Not allowed to update vaccination",
            }));
        }
        const parsed = vaccination_validator_1.updateVaccinationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const { publicId, vaccinationPublicId } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { public_id: publicId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const vaccination = await models_1.Vaccination.findOne({
            where: {
                public_id: vaccinationPublicId,
                animal_id: animal.get("id"),
                ranch_id: ranchId,
                deleted_at: null,
            },
        });
        if (!vaccination) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Vaccination not found",
            }));
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
        const nextDueAt = vaccination.get("next_due_at");
        if (nextDueAt && nextDueAt < new Date()) {
            await (0, ranchAlert_service_1.createRanchAlert)({
                ranchId,
                animalId: String(animal.get("id")),
                alertType: "vaccination_overdue",
                title: "Vaccination overdue alert",
                message: `${vaccination.get("vaccine_name")} for animal ${animal.get("tag_number")} is overdue`,
                priority: "high",
                entityType: "vaccination",
                entityPublicId: String(vaccination.get("public_id")),
                dedupe: true,
                dedupeMinutes: 1440,
            });
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Vaccination updated successfully",
            data: {
                vaccination: {
                    publicId: vaccination.get("public_id"),
                    vaccineName: vaccination.get("vaccine_name"),
                    dose: vaccination.get("dose"),
                    administeredAt: vaccination.get("administered_at"),
                    nextDueAt: vaccination.get("next_due_at"),
                    notes: vaccination.get("notes"),
                },
            },
        }));
    }
    catch (err) {
        console.error("UPDATE_VACCINATION_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to update vaccination",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function deleteAnimalVaccination(req, res) {
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const { publicId, vaccinationPublicId } = req.params;
        const role = req.membership?.ranchRole;
        if (!canManageVaccinations(role)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Not allowed to delete vaccination",
            }));
        }
        const parsed = vaccination_validator_1.deleteVaccinationSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const animal = await models_1.Animal.findOne({
            where: { public_id: publicId, ranch_id: ranchId },
            attributes: ["id", "public_id", "tag_number"],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const vaccination = await models_1.Vaccination.findOne({
            where: {
                public_id: vaccinationPublicId,
                animal_id: animal.get("id"),
                ranch_id: ranchId,
                deleted_at: null,
            },
        });
        if (!vaccination) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Vaccination not found",
            }));
        }
        await vaccination.update({
            deleted_at: new Date(),
            deleted_by: userId,
            delete_reason: parsed.data.reason ?? null,
            updated_at: new Date(),
            updated_by: userId,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Vaccination archived successfully",
        }));
    }
    catch (err) {
        console.error("DELETE_VACCINATION_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to delete vaccination",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
