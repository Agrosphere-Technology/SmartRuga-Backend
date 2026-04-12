import { RANCH_ROLES } from "../constants/roles";

export function canViewAlerts(role: string) {
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

export function canManageAlerts(role: string) {
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

export function parseIntSafe(val: any, def: number) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export function formatRanchAlert(alert: any) {
    const animal = alert?.get?.("animal") ?? alert?.animal;
    const readByUser = alert?.get?.("readByUser") ?? alert?.readByUser;

    return {
        publicId:
            alert.getDataValue?.("public_id") ??
            alert.public_id ??
            null,
        alertType:
            alert.getDataValue?.("alert_type") ??
            alert.alert_type ??
            null,
        title:
            alert.getDataValue?.("title") ??
            alert.title ??
            null,
        message:
            alert.getDataValue?.("message") ??
            alert.message ??
            null,
        priority:
            alert.getDataValue?.("priority") ??
            alert.priority ??
            null,
        entityType:
            alert.getDataValue?.("entity_type") ??
            alert.entity_type ??
            null,
        entityPublicId:
            alert.getDataValue?.("entity_public_id") ??
            alert.entity_public_id ??
            null,
        isRead:
            alert.getDataValue?.("is_read") ??
            alert.is_read ??
            false,
        readAt:
            alert.getDataValue?.("read_at") ??
            alert.read_at ??
            null,
        createdAt:
            alert.getDataValue?.("created_at") ??
            alert.created_at ??
            null,
        animal: animal
            ? {
                publicId:
                    animal.getDataValue?.("public_id") ??
                    animal.public_id ??
                    null,
                tagNumber:
                    animal.getDataValue?.("tag_number") ??
                    animal.tag_number ??
                    null,
            }
            : null,
        readByUser: readByUser
            ? {
                publicId:
                    readByUser.getDataValue?.("public_id") ??
                    readByUser.public_id ??
                    readByUser.publicId ??
                    null,
                email:
                    readByUser.getDataValue?.("email") ??
                    readByUser.email ??
                    null,
            }
            : null,
    };
}