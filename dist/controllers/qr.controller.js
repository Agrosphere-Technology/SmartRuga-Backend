"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrScanAnimal = qrScanAnimal;
const models_1 = require("../models");
const qr_1 = require("../utils/qr");
const http_status_codes_1 = require("http-status-codes");
const animalHealth_service_1 = require("../services/animalHealth.service");
const apiResponse_1 = require("../utils/apiResponse");
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
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Animal not found",
            }));
        }
        const animalId = animal.get("id");
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
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Animal QR profile fetched successfully",
            data: {
                animal: {
                    publicId: animal.get("public_id"),
                    tagNumber: animal.get("tag_number"),
                    sex: animal.get("sex"),
                    status: animal.get("status"),
                    healthStatus,
                    qrUrl: (0, qr_1.buildAnimalQrUrl)(animal.get("public_id")),
                    species: {
                        id: animal.species?.id ?? null,
                        name: animal.species?.name ?? null,
                        code: animal.species?.code ?? null,
                    },
                },
            },
        }));
    }
    catch (err) {
        console.error("QR_SCAN_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to load animal",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
