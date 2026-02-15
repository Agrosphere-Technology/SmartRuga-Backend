"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestHealthForAnimals = getLatestHealthForAnimals;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
async function getLatestHealthForAnimals(animalIds) {
    if (!animalIds.length)
        return {};
    const rows = await models_1.sequelize.query(`
    SELECT DISTINCT ON (animal_id)
      animal_id,
      status
    FROM animal_health_events
    WHERE animal_id = ANY($1::uuid[])
    ORDER BY animal_id, created_at DESC
    `, {
        bind: [animalIds], // ✅ ARRAY binding
        type: sequelize_1.QueryTypes.SELECT,
    });
    const map = {};
    for (const row of rows) {
        map[row.animal_id] = row.status;
    }
    return map;
}
