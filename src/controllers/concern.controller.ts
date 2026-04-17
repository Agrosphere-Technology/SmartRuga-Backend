import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import { Concern, RanchMember, User } from "../models";
import {
    createConcernSchema,
    listConcernsQuerySchema,
    updateConcernSchema,
} from "../validators/concern.validator";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { createRanchAlert } from "../services/ranchAlert.service";
import {
    uploadBufferToCloudinary,
    deleteFromCloudinary,
} from "../services/cloudinary.service";
import { RANCH_ROLES } from "../constants/roles";

function buildUserName(user: any) {
    return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
}

function formatUser(user: any) {
    if (!user) return null;

    return {
        publicId: user.id,
        name: buildUserName(user) || null,
        email: user.email,
    };
}

function formatConcern(concern: any) {
    const raisedByUser = concern.raisedByUser ?? concern.get?.("raisedByUser") ?? null;
    const assignedToUser =
        concern.assignedToUser ?? concern.get?.("assignedToUser") ?? null;
    const resolvedByUser =
        concern.resolvedByUser ?? concern.get?.("resolvedByUser") ?? null;

    return {
        publicId: concern.getDataValue?.("public_id") ?? concern.public_id,
        category: concern.getDataValue?.("category") ?? concern.category,
        title: concern.getDataValue?.("title") ?? concern.title,
        description: concern.getDataValue?.("description") ?? concern.description,
        priority: concern.getDataValue?.("priority") ?? concern.priority,
        status: concern.getDataValue?.("status") ?? concern.status,
        entityType: concern.getDataValue?.("entity_type") ?? concern.entity_type,
        entityPublicId:
            concern.getDataValue?.("entity_public_id") ?? concern.entity_public_id,
        imageUrl: concern.getDataValue?.("image_url") ?? concern.image_url,
        imagePublicId:
            concern.getDataValue?.("image_public_id") ?? concern.image_public_id,
        resolutionNotes:
            concern.getDataValue?.("resolution_notes") ?? concern.resolution_notes,
        resolvedAt: concern.getDataValue?.("resolved_at") ?? concern.resolved_at,
        createdAt: concern.getDataValue?.("created_at") ?? concern.created_at,
        updatedAt: concern.getDataValue?.("updated_at") ?? concern.updated_at,
        raisedBy: formatUser(raisedByUser),
        assignedTo: formatUser(assignedToUser),
        resolvedBy: formatUser(resolvedByUser),
    };
}

function canManageConcern(role: string) {
    return role === RANCH_ROLES.OWNER || role === RANCH_ROLES.MANAGER;
}

export async function createConcern(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const raisedByUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;

        if (
            ![
                RANCH_ROLES.OWNER,
                RANCH_ROLES.MANAGER,
                RANCH_ROLES.WORKER,
                RANCH_ROLES.VET,
                RANCH_ROLES.STOREKEEPER,
            ].includes(ranchRole)
        ) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Not allowed to raise concerns",
                })
            );
        }

        const parsed = createConcernSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const {
            category,
            title,
            description,
            priority,
            assignedToUserPublicId,
            entityType,
            entityPublicId,
        } = parsed.data;

        let assignedToUserId: string | null = null;

        if (assignedToUserPublicId) {
            const assignedUser = await User.findOne({
                where: { id: assignedToUserPublicId },
            });

            if (!assignedUser) {
                return res.status(StatusCodes.NOT_FOUND).json(
                    errorResponse({
                        message: "Assigned user not found",
                    })
                );
            }

            const assignedMembership = await RanchMember.findOne({
                where: {
                    ranch_id: ranchId,
                    user_id: assignedUser.getDataValue("id"),
                },
            });

            if (!assignedMembership) {
                return res.status(StatusCodes.BAD_REQUEST).json(
                    errorResponse({
                        message: "Assigned user is not a member of this ranch",
                    })
                );
            }

            assignedToUserId = assignedUser.getDataValue("id");
        }

        let imageUrl: string | null = null;
        let imagePublicId: string | null = null;

        if (req.file) {
            const uploadResult = await uploadBufferToCloudinary(
                req.file.buffer,
                `smartruga/concerns/${ranchId}`,
                `concern-${Date.now()}`
            );

            imageUrl = uploadResult.secureUrl;
            imagePublicId = uploadResult.publicId;
        }

        const concern = await Concern.create({
            ranch_id: ranchId,
            raised_by_user_id: raisedByUserId,
            assigned_to_user_id: assignedToUserId,
            category,
            title,
            description,
            priority: priority ?? "medium",
            status: "open",
            entity_type: entityType ?? null,
            entity_public_id: entityPublicId ?? null,
            image_url: imageUrl,
            image_public_id: imagePublicId,
            resolution_notes: null,
            resolved_by_user_id: null,
            resolved_at: null,
        });

        await createRanchAlert({
            ranchId,
            alertType: "concern_raised",
            title: "New concern raised",
            message: `${title} (${category}, ${priority ?? "medium"})`,
            priority: priority === "urgent" ? "high" : priority ?? "medium",
            entityType: "concern",
            entityPublicId: String(concern.getDataValue("public_id")),
            dedupe: false,
        });

        const createdConcern = await Concern.findOne({
            where: { id: concern.getDataValue("id") },
            include: [
                {
                    model: User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        return res.status(StatusCodes.CREATED).json(
            successResponse({
                message: "Concern raised successfully",
                data: {
                    concern: formatConcern(createdConcern),
                },
            })
        );
    } catch (err: any) {
        console.error("CREATE_CONCERN_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to raise concern",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function listConcerns(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;

        const parsed = listConcernsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid query params",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const {
            page,
            limit,
            status,
            priority,
            category,
            raisedByMe,
            assignedToMe,
            search,
            sortBy,
            sortOrder,
        } = parsed.data;

        const offset = (page - 1) * limit;

        const baseWhere: any = {
            ranch_id: ranchId,
        };

        if (!canManageConcern(ranchRole)) {
            baseWhere[Op.or] = [
                { raised_by_user_id: userId },
                { assigned_to_user_id: userId },
            ];
        }

        const where: any = {
            ...baseWhere,
        };

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (category) where.category = category;
        if (raisedByMe) where.raised_by_user_id = userId;
        if (assignedToMe) where.assigned_to_user_id = userId;

        if (search) {
            where[Op.and] = where[Op.and] ?? [];
            where[Op.and].push({
                [Op.or]: [
                    { title: { [Op.iLike]: `%${search}%` } },
                    { description: { [Op.iLike]: `%${search}%` } },
                ],
            });
        }

        let order: any[] = [["created_at", sortOrder.toUpperCase()]];
        if (sortBy === "priority") order = [["priority", sortOrder.toUpperCase()]];
        if (sortBy === "status") order = [["status", sortOrder.toUpperCase()]];

        const { count, rows } = await Concern.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
            order,
            limit,
            offset,
            distinct: true,
        });

        const total = count;
        const totalPages = Math.ceil(total / limit) || 1;

        const [openCount, inReviewCount, resolvedCount, dismissedCount] =
            await Promise.all([
                Concern.count({
                    where: {
                        ...baseWhere,
                        status: "open",
                    },
                }),
                Concern.count({
                    where: {
                        ...baseWhere,
                        status: "in_review",
                    },
                }),
                Concern.count({
                    where: {
                        ...baseWhere,
                        status: "resolved",
                    },
                }),
                Concern.count({
                    where: {
                        ...baseWhere,
                        status: "dismissed",
                    },
                }),
            ]);

        const totalCount =
            openCount + inReviewCount + resolvedCount + dismissedCount;

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Concerns fetched successfully",
                data: {
                    concerns: rows.map((concern: any) => formatConcern(concern)),
                },
                meta: {
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNextPage: page < totalPages,
                        hasPreviousPage: page > 1,
                    },
                    summary: {
                        total: totalCount,
                        open: openCount,
                        inReview: inReviewCount,
                        resolved: resolvedCount,
                        dismissed: dismissedCount,
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("LIST_CONCERNS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch concerns",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function getConcernByPublicId(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { concernPublicId } = req.params;

        const concern = await Concern.findOne({
            where: {
                public_id: concernPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        if (!concern) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Concern not found",
                })
            );
        }

        const raisedByUserId = concern.getDataValue("raised_by_user_id");
        const assignedToUserId = concern.getDataValue("assigned_to_user_id");

        if (
            !canManageConcern(ranchRole) &&
            raisedByUserId !== userId &&
            assignedToUserId !== userId
        ) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "You are not allowed to view this concern",
                })
            );
        }

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Concern fetched successfully",
                data: {
                    concern: formatConcern(concern),
                },
            })
        );
    } catch (err: any) {
        console.error("GET_CONCERN_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch concern",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function updateConcern(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { concernPublicId } = req.params;

        if (!canManageConcern(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only owner or manager can update concerns",
                })
            );
        }

        const parsed = updateConcernSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const concern = await Concern.findOne({
            where: {
                public_id: concernPublicId,
                ranch_id: ranchId,
            },
        });

        if (!concern) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Concern not found",
                })
            );
        }

        const { status, priority, assignedToUserPublicId, resolutionNotes } = parsed.data;

        let assignedToUserId: string | null | undefined = undefined;

        if (assignedToUserPublicId !== undefined) {
            if (assignedToUserPublicId === null) {
                assignedToUserId = null;
            } else {
                const assignedUser = await User.findOne({
                    where: { id: assignedToUserPublicId },
                });

                if (!assignedUser) {
                    return res.status(StatusCodes.NOT_FOUND).json(
                        errorResponse({
                            message: "Assigned user not found",
                        })
                    );
                }

                const assignedMembership = await RanchMember.findOne({
                    where: {
                        ranch_id: ranchId,
                        user_id: assignedUser.getDataValue("id"),
                    },
                });

                if (!assignedMembership) {
                    return res.status(StatusCodes.BAD_REQUEST).json(
                        errorResponse({
                            message: "Assigned user is not a member of this ranch",
                        })
                    );
                }

                assignedToUserId = assignedUser.getDataValue("id");
            }
        }

        const updates: any = {};

        if (status !== undefined) updates.status = status;
        if (priority !== undefined) updates.priority = priority;
        if (assignedToUserId !== undefined) updates.assigned_to_user_id = assignedToUserId;
        if (resolutionNotes !== undefined) updates.resolution_notes = resolutionNotes;

        if (status === "resolved" || status === "dismissed") {
            updates.resolved_by_user_id = currentUserId;
            updates.resolved_at = new Date();
        }

        if (status === "open" || status === "in_review") {
            updates.resolved_by_user_id = null;
            updates.resolved_at = null;
        }

        await concern.update(updates);

        if (status === "resolved") {
            await createRanchAlert({
                ranchId,
                alertType: "concern_resolved",
                title: "Concern resolved",
                message: `${concern.getDataValue("title")} was resolved`,
                priority: "low",
                entityType: "concern",
                entityPublicId: String(concern.getDataValue("public_id")),
                dedupe: false,
            });
        }

        const updatedConcern = await Concern.findOne({
            where: { id: concern.getDataValue("id") },
            include: [
                {
                    model: User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Concern updated successfully",
                data: {
                    concern: formatConcern(updatedConcern),
                },
            })
        );
    } catch (err: any) {
        console.error("UPDATE_CONCERN_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to update concern",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function uploadConcernImage(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { concernPublicId } = req.params;

        if (!req.file) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Image file is required",
                })
            );
        }

        const concern = await Concern.findOne({
            where: {
                public_id: concernPublicId,
                ranch_id: ranchId,
            },
        });

        if (!concern) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Concern not found",
                })
            );
        }

        const raisedByUserId = concern.getDataValue("raised_by_user_id");

        if (!canManageConcern(ranchRole) && raisedByUserId !== userId) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "You are not allowed to upload image for this concern",
                })
            );
        }

        const oldImagePublicId = concern.getDataValue("image_public_id");
        if (oldImagePublicId) {
            await deleteFromCloudinary(String(oldImagePublicId));
        }

        const uploadResult = await uploadBufferToCloudinary(
            req.file.buffer,
            `smartruga/concerns/${ranchId}`,
            `concern-${concern.getDataValue("public_id")}`
        );

        await concern.update({
            image_url: uploadResult.secureUrl,
            image_public_id: uploadResult.publicId,
        });

        const updatedConcern = await Concern.findOne({
            where: { id: concern.getDataValue("id") },
            include: [
                {
                    model: User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Concern image uploaded successfully",
                data: {
                    concern: formatConcern(updatedConcern),
                },
            })
        );
    } catch (err: any) {
        console.error("UPLOAD_CONCERN_IMAGE_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to upload concern image",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function removeConcernImage(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const userId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { concernPublicId } = req.params;

        const concern = await Concern.findOne({
            where: {
                public_id: concernPublicId,
                ranch_id: ranchId,
            },
        });

        if (!concern) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Concern not found",
                })
            );
        }

        const raisedByUserId = concern.getDataValue("raised_by_user_id");

        if (!canManageConcern(ranchRole) && raisedByUserId !== userId) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "You are not allowed to remove image from this concern",
                })
            );
        }

        const oldImagePublicId = concern.getDataValue("image_public_id");
        if (!oldImagePublicId) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Concern has no image",
                })
            );
        }

        await deleteFromCloudinary(String(oldImagePublicId));

        await concern.update({
            image_url: null,
            image_public_id: null,
        });

        const updatedConcern = await Concern.findOne({
            where: { id: concern.getDataValue("id") },
            include: [
                {
                    model: User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Concern image removed successfully",
                data: {
                    concern: formatConcern(updatedConcern),
                },
            })
        );
    } catch (err: any) {
        console.error("REMOVE_CONCERN_IMAGE_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to remove concern image",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}