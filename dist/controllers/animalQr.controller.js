"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnimalQrPng = getAnimalQrPng;
const http_status_codes_1 = require("http-status-codes");
const qrcode_1 = __importDefault(require("qrcode"));
const models_1 = require("../models");
const qr_1 = require("../utils/qr");
async function getAnimalQrPng(req, res) {
    try {
        const ranchId = req.ranch.id;
        const { id } = req.params;
        const animal = await models_1.Animal.findOne({ where: { id, ranch_id: ranchId } });
        if (!animal) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
        }
        const publicId = animal.get("public_id");
        const url = (0, qr_1.buildAnimalQrUrl)(publicId);
        const pngBuffer = await qrcode_1.default.toBuffer(url, {
            type: "png",
            errorCorrectionLevel: "M",
            margin: 2,
            width: 320,
        });
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600"); // optional
        return res.status(http_status_codes_1.StatusCodes.OK).send(pngBuffer);
    }
    catch (err) {
        console.error("ANIMAL_QR_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to generate QR code",
            error: err?.message ?? "Unknown error",
        });
    }
}
