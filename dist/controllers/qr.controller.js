"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrScanAnimal = qrScanAnimal;
const models_1 = require("../models");
const qr_1 = require("../utils/qr");
const http_status_codes_1 = require("http-status-codes");
const animalHealth_service_1 = require("../services/animalHealth.service");
async function qrScanAnimal(req, res) {
    try {
        const { publicId } = req.params;
        const animal = await models_1.Animal.findOne({
            where: { public_id: publicId },
            include: [
                { model: models_1.Species, as: "species", attributes: ["id", "name", "code"] },
            ],
        });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).send("Animal not found");
        }
        const animalId = animal.get("id");
        // ✅ latest health (from service)
        const healthMap = await (0, animalHealth_service_1.getLatestHealthForAnimals)([animalId]);
        const healthStatus = healthMap[animalId] ?? "healthy";
        const accept = req.headers.accept || "";
        if (accept.includes("text/html")) {
            return res.send(`
        <html>
          <head><title>SmartRUGA Animal</title></head>
          <body style="font-family: Arial; padding: 24px;">
            <h2>SmartRUGA Animal Profile</h2>
            <p><b>Tag:</b> ${animal.get("tag_number") ?? "-"}</p>
            <p><b>Species:</b> ${animal.species?.name ?? "-"}</p>
            <p><b>Status:</b> ${animal.get("status")}</p>
            <p><b>Health:</b> ${healthStatus}</p>
            <p><b>QR URL:</b> ${(0, qr_1.buildAnimalQrUrl)(animal.get("public_id"))}</p>
            <hr/>
            <p><a href="/api/v1/docs">Open API Docs</a></p>
          </body>
        </html>
      `);
        }
        return res.json({
            publicId: animal.get("public_id"),
            tagNumber: animal.get("tag_number"),
            sex: animal.get("sex"),
            status: animal.get("status"),
            healthStatus,
            species: {
                id: animal.species?.id,
                name: animal.species?.name,
                code: animal.species?.code,
            },
        });
    }
    catch (err) {
        console.error("QR_SCAN_ERROR:", err);
        return res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Failed to load animal");
    }
}
