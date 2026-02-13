import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Animal, AnimalHealthEvent } from "../models";
import { createHealthEventSchema } from "../validators/animalHealth.validator";
import { RANCH_ROLES } from "../constants/roles";

const CAN_WRITE_HEALTH = [RANCH_ROLES.OWNER, RANCH_ROLES.MANAGER, RANCH_ROLES.VET] as const;

export async function addAnimalHealthEvent(req: Request, res: Response) {
    try {
        const parsed = createHealthEventSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid payload",
                issues: parsed.error.issues,
            });
        }

        const requesterRole = req.membership!.ranchRole;

        if (!CAN_WRITE_HEALTH.includes(requesterRole as any)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only owner/manager/vet can record health events",
            });
        }

        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
        }

        const event = await AnimalHealthEvent.create({
            animal_id: animalId,
            status: parsed.data.status,
            notes: parsed.data.notes ?? null,
            recorded_by: req.user!.id,
            created_at: new Date(),
        } as any);

        return res.status(StatusCodes.CREATED).json({
            event: {
                id: event.get("id"),
                animalId: event.get("animal_id"),
                status: event.get("status"),
                notes: event.get("notes"),
                recordedBy: event.get("recorded_by"),
                createdAt: event.get("created_at"),
            },
        });
    } catch (err: any) {
        console.error("ADD_HEALTH_EVENT_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to add health event",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}

export async function listAnimalHealthEvents(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { animalId } = req.params;

        // ensure animal belongs to ranch
        const animal = await Animal.findOne({
            where: { id: animalId, ranch_id: ranchId },
        } as any);

        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
        }

        const events = await AnimalHealthEvent.findAll({
            where: { animal_id: animalId },
            order: [["created_at", "DESC"]],
        } as any);

        return res.json({
            animalId,
            events: events.map((e: any) => ({
                id: e.get("id"),
                status: e.get("status"),
                notes: e.get("notes"),
                recordedBy: e.get("recorded_by"),
                createdAt: e.get("created_at"),
            })),
        });
    } catch (err: any) {
        console.error("LIST_HEALTH_EVENTS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list health events",
            error: err?.message ?? "Unknown error",
            details: err?.errors ?? null,
        });
    }
}
