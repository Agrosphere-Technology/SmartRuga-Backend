"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canViewAlerts = canViewAlerts;
exports.canManageAlerts = canManageAlerts;
exports.parseIntSafe = parseIntSafe;
exports.formatRanchAlert = formatRanchAlert;
const roles_1 = require("../constants/roles");
function canViewAlerts(role) {
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
function canManageAlerts(role) {
    return (role === roles_1.RANCH_ROLES.OWNER ||
        role === roles_1.RANCH_ROLES.MANAGER ||
        role === roles_1.RANCH_ROLES.VET);
}
function parseIntSafe(val, def) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}
function formatRanchAlert(alert) {
    const animal = alert?.get?.("animal") ?? alert?.animal;
    const readByUser = alert?.get?.("readByUser") ?? alert?.readByUser;
    return {
        publicId: alert.getDataValue?.("public_id") ??
            alert.public_id ??
            null,
        alertType: alert.getDataValue?.("alert_type") ??
            alert.alert_type ??
            null,
        title: alert.getDataValue?.("title") ??
            alert.title ??
            null,
        message: alert.getDataValue?.("message") ??
            alert.message ??
            null,
        priority: alert.getDataValue?.("priority") ??
            alert.priority ??
            null,
        entityType: alert.getDataValue?.("entity_type") ??
            alert.entity_type ??
            null,
        entityPublicId: alert.getDataValue?.("entity_public_id") ??
            alert.entity_public_id ??
            null,
        isRead: alert.getDataValue?.("is_read") ??
            alert.is_read ??
            false,
        readAt: alert.getDataValue?.("read_at") ??
            alert.read_at ??
            null,
        createdAt: alert.getDataValue?.("created_at") ??
            alert.created_at ??
            null,
        animal: animal
            ? {
                publicId: animal.getDataValue?.("public_id") ??
                    animal.public_id ??
                    null,
                tagNumber: animal.getDataValue?.("tag_number") ??
                    animal.tag_number ??
                    null,
            }
            : null,
        readByUser: readByUser
            ? {
                publicId: readByUser.getDataValue?.("public_id") ??
                    readByUser.public_id ??
                    readByUser.publicId ??
                    null,
                email: readByUser.getDataValue?.("email") ??
                    readByUser.email ??
                    null,
            }
            : null,
    };
}
