import { Op, Transaction } from "sequelize";
import { RanchAlert } from "../models";

export type AlertType =
    | "health_sick"
    | "health_quarantined"
    | "status_sold"
    | "status_deceased"
    | "low_stock"
    | "vaccination_overdue"
    | "task_created"
    | "task_status_changed"
    | "task_cancelled"
    | "task_submission_pending_review"
    | "task_submission_rejected";

export type AlertPriority = "low" | "medium" | "high";

type CreateRanchAlertParams = {
    ranchId: string;
    animalId?: string | null;
    alertType: AlertType;
    title: string;
    message: string;
    priority?: AlertPriority;
    entityType?: string | null;
    entityPublicId?: string | null;
    transaction?: Transaction;
    dedupe?: boolean;
    dedupeMinutes?: number;
};

export async function createRanchAlert(params: CreateRanchAlertParams) {
    const {
        ranchId,
        animalId = null,
        alertType,
        title,
        message,
        priority = "medium",
        entityType = null,
        entityPublicId = null,
        transaction,
        dedupe = false,
        dedupeMinutes = 60,
    } = params;

    if (dedupe) {
        const since = new Date(Date.now() - dedupeMinutes * 60 * 1000);

        const existingAlert = await (RanchAlert as any).findOne({
            where: {
                ranch_id: ranchId,
                animal_id: animalId,
                alert_type: alertType,
                entity_type: entityType,
                entity_public_id: entityPublicId,
                is_read: false,
                created_at: {
                    [Op.gte]: since,
                },
            },
            transaction,
        });

        if (existingAlert) {
            return existingAlert;
        }
    }

    const alert = await (RanchAlert as any).create(
        {
            ranch_id: ranchId,
            animal_id: animalId,
            alert_type: alertType,
            title,
            message,
            priority,
            entity_type: entityType,
            entity_public_id: entityPublicId,
            is_read: false,
            read_by: null,
            read_at: null,
            created_at: new Date(),
            updated_at: new Date(),
        },
        transaction ? { transaction } : undefined
    );

    return alert;
}