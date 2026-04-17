"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBufferToCloudinary = uploadBufferToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
async function uploadBufferToCloudinary(fileBuffer, folder, publicId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({
            folder,
            public_id: publicId,
            resource_type: "image",
        }, (error, result) => {
            if (error || !result) {
                return reject(error || new Error("Cloudinary upload failed"));
            }
            resolve({
                secureUrl: result.secure_url,
                publicId: result.public_id,
            });
        });
        stream.end(fileBuffer);
    });
}
async function deleteFromCloudinary(publicId) {
    if (!publicId)
        return;
    await cloudinary_1.default.uploader.destroy(publicId, {
        resource_type: "image",
    });
}
