"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyProfile = getMyProfile;
exports.updateMe = updateMe;
exports.uploadMyProfileImage = uploadMyProfileImage;
exports.removeMyProfileImage = removeMyProfileImage;
const cloudinary_1 = require("cloudinary");
const http_status_codes_1 = require("http-status-codes");
const models_1 = require("../models");
const profile_validator_1 = require("../validators/profile.validator");
const user_helpers_1 = require("../helpers/user.helpers");
const apiResponse_1 = require("../utils/apiResponse");
function uploadBufferToCloudinary(fileBuffer, folder, publicId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: publicId,
            resource_type: "image",
            overwrite: true,
        }, (error, result) => {
            if (error || !result) {
                reject(error ?? new Error("Image upload failed"));
                return;
            }
            resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
            });
        });
        stream.end(fileBuffer);
    });
}
function formatUserProfile(user) {
    return {
        id: user.get("id"),
        email: user.get("email"),
        first_name: user.get("first_name"),
        last_name: user.get("last_name"),
        phone: user.get("phone"),
        imageUrl: user.get("image_url"),
        imagePublicId: user.get("image_public_id"),
        platform_role: user.get("platform_role"),
        is_active: user.get("is_active"),
        createdAt: user.get("created_at"),
        updatedAt: user.get("updated_at"),
    };
}
async function getUserMemberships(userId) {
    return models_1.RanchMember.findAll({
        where: { user_id: userId },
        include: [
            {
                model: models_1.Ranch,
                as: "ranch",
                attributes: ["id", "name", "slug"],
            },
        ],
        attributes: ["id", "role", "ranch_id"],
    });
}
function formatMemberships(memberships) {
    return memberships.map((membership) => ({
        ranchId: membership.get("ranch_id"),
        ranchName: membership.ranch?.get("name") ?? null,
        ranchSlug: membership.ranch?.get("slug") ?? null,
        role: membership.get("role"),
    }));
}
async function getMyProfile(req, res) {
    try {
        const userId = req.user.id;
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "User not found",
            }));
        }
        const memberships = await getUserMemberships(userId);
        const missingFields = (0, user_helpers_1.profileMissingFields)(user);
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Profile fetched successfully",
            data: {
                user: formatUserProfile(user),
                memberships: formatMemberships(memberships),
                profileComplete: missingFields.length === 0,
                missingFields,
            },
        }));
    }
    catch (err) {
        console.error("GET_ME_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch profile",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function updateMe(req, res) {
    try {
        const payload = {
            ...req.body,
        };
        const parsed = profile_validator_1.updateMeSchema.safeParse(payload);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const userId = req.user.id;
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "User not found",
            }));
        }
        const { first_name, last_name, phone } = parsed.data;
        const updates = {
            ...(first_name !== undefined ? { first_name } : {}),
            ...(last_name !== undefined ? { last_name } : {}),
            ...(phone !== undefined ? { phone } : {}),
        };
        if (req.file) {
            const existingImagePublicId = user.get("image_public_id");
            if (existingImagePublicId) {
                await cloudinary_1.v2.uploader.destroy(String(existingImagePublicId));
            }
            const uploadResult = await uploadBufferToCloudinary(req.file.buffer, "smartruga/users", `user-${userId}`);
            updates.image_url = uploadResult.secure_url;
            updates.image_public_id = uploadResult.public_id;
        }
        await user.update(updates);
        const memberships = await getUserMemberships(userId);
        const missingFields = (0, user_helpers_1.profileMissingFields)(user);
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Profile updated successfully",
            data: {
                user: formatUserProfile(user),
                memberships: formatMemberships(memberships),
                profileComplete: missingFields.length === 0,
                missingFields,
            },
        }));
    }
    catch (err) {
        console.error("UPDATE_ME_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to update profile",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function uploadMyProfileImage(req, res) {
    try {
        const userId = req.user.id;
        if (!req.file) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Image file is required",
            }));
        }
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "User not found",
            }));
        }
        const existingImagePublicId = user.get("image_public_id");
        if (existingImagePublicId) {
            await cloudinary_1.v2.uploader.destroy(String(existingImagePublicId));
        }
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, "smartruga/users", `user-${userId}`);
        await user.update({
            image_url: uploadResult.secure_url,
            image_public_id: uploadResult.public_id,
        });
        const memberships = await getUserMemberships(userId);
        const missingFields = (0, user_helpers_1.profileMissingFields)(user);
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Profile image uploaded successfully",
            data: {
                user: formatUserProfile(user),
                memberships: formatMemberships(memberships),
                profileComplete: missingFields.length === 0,
                missingFields,
            },
        }));
    }
    catch (err) {
        console.error("UPLOAD_MY_PROFILE_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to upload profile image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function removeMyProfileImage(req, res) {
    try {
        const userId = req.user.id;
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "User not found",
            }));
        }
        const imagePublicId = user.get("image_public_id");
        if (!imagePublicId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Profile has no image",
            }));
        }
        await cloudinary_1.v2.uploader.destroy(String(imagePublicId));
        await user.update({
            image_url: null,
            image_public_id: null,
        });
        const memberships = await getUserMemberships(userId);
        const missingFields = (0, user_helpers_1.profileMissingFields)(user);
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Profile image removed successfully",
            data: {
                user: formatUserProfile(user),
                memberships: formatMemberships(memberships),
                profileComplete: missingFields.length === 0,
                missingFields,
            },
        }));
    }
    catch (err) {
        console.error("REMOVE_MY_PROFILE_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to remove profile image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
