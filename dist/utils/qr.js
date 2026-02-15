"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAnimalQrUrl = buildAnimalQrUrl;
function buildAnimalQrUrl(publicId) {
    const base = (process.env.QR_BASE_URL || "").replace(/\/+$/, "");
    if (!base)
        throw new Error("QR_BASE_URL is not set");
    return `${base}/a/${publicId}`;
}
