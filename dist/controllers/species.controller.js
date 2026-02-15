"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSpecies = listSpecies;
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
async function listSpecies(_req, res) {
    try {
        const rows = await models_1.Species.findAll({
            attributes: ["id", "name", "code"],
            order: [["name", "ASC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            species: rows.map((s) => ({
                id: s.get("id"),
                name: s.get("name"),
                code: s.get("code"),
            })),
        });
    }
    catch (err) {
        console.error("LIST_SPECIES_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list species",
            error: err?.message ?? "Unknown error",
        });
    }
}
