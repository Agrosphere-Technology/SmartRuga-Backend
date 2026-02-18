import { Transaction } from "sequelize";
import { RanchAlert } from "../models";

type AlertType = "health_sick" | "health_quarantined" | "status_sold" | "status_deceased";

export async function createRanchAlert(params: {
    ranchId: string;
    animalId?: string | null;
    alertType: AlertType;
    message: string;
    transaction?: Transaction;
}) {
    const { ranchId, animalId = null, alertType, message, transaction } = params;

    await (RanchAlert as any).create(
        {
            ranch_id: ranchId,
            animal_id: animalId,
            alert_type: alertType,
            message,
            is_read: false,
            created_at: new Date(),
        },
        transaction ? { transaction } : undefined
    );
}
