import { Transaction } from "sequelize";
import { RanchAlert } from "../models";

type AlertType =
    | "health_sick"
    | "health_quarantined"
    | "status_sold"
    | "status_deceased"
    | "low_stock"
    | "vaccination_overdue"
    | "task_submission_pending_review"
    | "task_submission_rejected";

type AlertPriority = "low" | "medium" | "high";

export async function createRanchAlert(params: {
    ranchId: string;
    animalId?: string | null;
    alertType: AlertType;
    title: string;
    message: string;
    priority?: AlertPriority;
    entityType?: string | null;
    entityPublicId?: string | null;
    transaction?: Transaction;
}) {
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
    } = params;

    await (RanchAlert as any).create(
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
        },
        transaction ? { transaction } : undefined
    );
}