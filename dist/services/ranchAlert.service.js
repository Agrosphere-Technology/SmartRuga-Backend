"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRanchAlert = createRanchAlert;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
async function createRanchAlert(params) {
    const { ranchId, animalId = null, alertType, title, message, priority = "medium", entityType = null, entityPublicId = null, transaction, dedupe = false, dedupeMinutes = 60, } = params;
    if (dedupe) {
        const since = new Date(Date.now() - dedupeMinutes * 60 * 1000);
        const existingAlert = await models_1.RanchAlert.findOne({
            where: {
                ranch_id: ranchId,
                animal_id: animalId,
                alert_type: alertType,
                entity_type: entityType,
                entity_public_id: entityPublicId,
                is_read: false,
                created_at: {
                    [sequelize_1.Op.gte]: since,
                },
            },
            transaction,
        });
        if (existingAlert) {
            return existingAlert;
        }
    }
    const alert = await models_1.RanchAlert.create({
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
    }, transaction ? { transaction } : undefined);
    return alert;
}
