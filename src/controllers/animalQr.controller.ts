import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import QRCode from "qrcode";
import { Animal } from "../models";
import { buildAnimalQrUrl } from "../utils/qr";

export async function getAnimalQrPng(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const { id } = req.params;

        const animal = await Animal.findOne({ where: { id, ranch_id: ranchId } });
        if (!animal) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Animal not found" });
        }

        const publicId = animal.get("public_id") as string;
        const url = buildAnimalQrUrl(publicId);

        const pngBuffer = await QRCode.toBuffer(url, {
            type: "png",
            errorCorrectionLevel: "M",
            margin: 2,
            width: 320,
        });

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600"); // optional
        return res.status(StatusCodes.OK).send(pngBuffer);
    } catch (err: any) {
        console.error("ANIMAL_QR_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to generate QR code",
            error: err?.message ?? "Unknown error",
        });
    }
}
