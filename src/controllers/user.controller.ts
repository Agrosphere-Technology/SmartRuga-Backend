import { v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { User, RanchMember, Ranch } from "../models";
import { updateMeSchema } from "../validators/profile.validator";
import { profileMissingFields } from "../helpers/user.helpers";
import { errorResponse, successResponse } from "../utils/apiResponse";

function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  publicId: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Image upload failed"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    stream.end(fileBuffer);
  });
}

function formatUserProfile(user: any) {
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

async function getUserMemberships(userId: string) {
  return RanchMember.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Ranch,
        as: "ranch",
        attributes: ["id", "name", "slug"],
      },
    ],
    attributes: ["id", "role", "ranch_id"],
  } as any);
}

function formatMemberships(memberships: any[]) {
  return memberships.map((membership: any) => ({
    ranchId: membership.get("ranch_id"),
    ranchName: membership.ranch?.get("name") ?? null,
    ranchSlug: membership.ranch?.get("slug") ?? null,
    role: membership.get("role"),
  }));
}

export async function getMyProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const memberships = await getUserMemberships(userId);
    const missingFields = profileMissingFields(user);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Profile fetched successfully",
        data: {
          user: formatUserProfile(user),
          memberships: formatMemberships(memberships),
          profileComplete: missingFields.length === 0,
          missingFields,
        },
      })
    );
  } catch (err: any) {
    console.error("GET_ME_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to fetch profile",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function updateMe(req: Request, res: Response) {
  try {
    const payload = {
      ...req.body,
    };

    const parsed = updateMeSchema.safeParse(payload);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid payload",
          errors: parsed.error.issues,
        })
      );
    }

    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const { first_name, last_name, phone } = parsed.data;

    const updates: Record<string, any> = {
      ...(first_name !== undefined ? { first_name } : {}),
      ...(last_name !== undefined ? { last_name } : {}),
      ...(phone !== undefined ? { phone } : {}),
    };

    if (req.file) {
      const existingImagePublicId = user.get("image_public_id");
      if (existingImagePublicId) {
        await cloudinary.uploader.destroy(String(existingImagePublicId));
      }

      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        "smartruga/users",
        `user-${userId}`
      );

      updates.image_url = uploadResult.secure_url;
      updates.image_public_id = uploadResult.public_id;
    }

    await user.update(updates);

    const memberships = await getUserMemberships(userId);
    const missingFields = profileMissingFields(user);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Profile updated successfully",
        data: {
          user: formatUserProfile(user),
          memberships: formatMemberships(memberships),
          profileComplete: missingFields.length === 0,
          missingFields,
        },
      })
    );
  } catch (err: any) {
    console.error("UPDATE_ME_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to update profile",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function uploadMyProfileImage(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Image file is required",
        })
      );
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const existingImagePublicId = user.get("image_public_id");
    if (existingImagePublicId) {
      await cloudinary.uploader.destroy(String(existingImagePublicId));
    }

    const uploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      "smartruga/users",
      `user-${userId}`
    );

    await user.update({
      image_url: uploadResult.secure_url,
      image_public_id: uploadResult.public_id,
    });

    const memberships = await getUserMemberships(userId);
    const missingFields = profileMissingFields(user);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Profile image uploaded successfully",
        data: {
          user: formatUserProfile(user),
          memberships: formatMemberships(memberships),
          profileComplete: missingFields.length === 0,
          missingFields,
        },
      })
    );
  } catch (err: any) {
    console.error("UPLOAD_MY_PROFILE_IMAGE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to upload profile image",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function removeMyProfileImage(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const imagePublicId = user.get("image_public_id");
    if (!imagePublicId) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Profile has no image",
        })
      );
    }

    await cloudinary.uploader.destroy(String(imagePublicId));

    await user.update({
      image_url: null,
      image_public_id: null,
    });

    const memberships = await getUserMemberships(userId);
    const missingFields = profileMissingFields(user);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Profile image removed successfully",
        data: {
          user: formatUserProfile(user),
          memberships: formatMemberships(memberships),
          profileComplete: missingFields.length === 0,
          missingFields,
        },
      })
    );
  } catch (err: any) {
    console.error("REMOVE_MY_PROFILE_IMAGE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to remove profile image",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}