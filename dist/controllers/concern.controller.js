"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConcern = createConcern;
exports.listConcerns = listConcerns;
exports.getConcernByPublicId = getConcernByPublicId;
exports.updateConcern = updateConcern;
exports.uploadConcernImage = uploadConcernImage;
exports.removeConcernImage = removeConcernImage;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const concern_validator_1 = require("../validators/concern.validator");
const apiResponse_1 = require("../utils/apiResponse");
const ranchAlert_service_1 = require("../services/ranchAlert.service");
const cloudinary_service_1 = require("../services/cloudinary.service");
const roles_1 = require("../constants/roles");
function buildUserName(user) {
    return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
}
function formatUser(user) {
    if (!user)
        return null;
    return {
        publicId: user.id,
        name: buildUserName(user) || null,
        email: user.email,
    };
}
function formatConcern(concern) {
    const raisedByUser = concern.raisedByUser ?? concern.get?.("raisedByUser") ?? null;
    const assignedToUser = concern.assignedToUser ?? concern.get?.("assignedToUser") ?? null;
    const resolvedByUser = concern.resolvedByUser ?? concern.get?.("resolvedByUser") ?? null;
    return {
        publicId: concern.getDataValue?.("public_id") ?? concern.public_id,
        category: concern.getDataValue?.("category") ?? concern.category,
        title: concern.getDataValue?.("title") ?? concern.title,
        description: concern.getDataValue?.("description") ?? concern.description,
        priority: concern.getDataValue?.("priority") ?? concern.priority,
        status: concern.getDataValue?.("status") ?? concern.status,
        entityType: concern.getDataValue?.("entity_type") ?? concern.entity_type,
        entityPublicId: concern.getDataValue?.("entity_public_id") ?? concern.entity_public_id,
        imageUrl: concern.getDataValue?.("image_url") ?? concern.image_url,
        imagePublicId: concern.getDataValue?.("image_public_id") ?? concern.image_public_id,
        resolutionNotes: concern.getDataValue?.("resolution_notes") ?? concern.resolution_notes,
        resolvedAt: concern.getDataValue?.("resolved_at") ?? concern.resolved_at,
        createdAt: concern.getDataValue?.("created_at") ?? concern.created_at,
        updatedAt: concern.getDataValue?.("updated_at") ?? concern.updated_at,
        raisedBy: formatUser(raisedByUser),
        assignedTo: formatUser(assignedToUser),
        resolvedBy: formatUser(resolvedByUser),
    };
}
function canManageConcern(role) {
    return role === roles_1.RANCH_ROLES.OWNER || role === roles_1.RANCH_ROLES.MANAGER;
}
async function createConcern(req, res) {
    try {
        const ranchId = req.ranch.id;
        const raisedByUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        if (![
            roles_1.RANCH_ROLES.OWNER,
            roles_1.RANCH_ROLES.MANAGER,
            roles_1.RANCH_ROLES.WORKER,
            roles_1.RANCH_ROLES.VET,
            roles_1.RANCH_ROLES.STOREKEEPER,
        ].includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Not allowed to raise concerns",
            }));
        }
        const parsed = concern_validator_1.createConcernSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const { category, title, description, priority, assignedToUserPublicId, entityType, entityPublicId, } = parsed.data;
        let assignedToUserId = null;
        if (assignedToUserPublicId) {
            const assignedUser = await models_1.User.findOne({
                where: { id: assignedToUserPublicId },
            });
            if (!assignedUser) {
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                    message: "Assigned user not found",
                }));
            }
            const assignedMembership = await models_1.RanchMember.findOne({
                where: {
                    ranch_id: ranchId,
                    user_id: assignedUser.getDataValue("id"),
                },
            });
            if (!assignedMembership) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                    message: "Assigned user is not a member of this ranch",
                }));
            }
            assignedToUserId = assignedUser.getDataValue("id");
        }
        let imageUrl = null;
        let imagePublicId = null;
        if (req.file) {
            const uploadResult = await (0, cloudinary_service_1.uploadBufferToCloudinary)(req.file.buffer, `smartruga/concerns/${ranchId}`, `concern-${Date.now()}`);
            imageUrl = uploadResult.secureUrl;
            imagePublicId = uploadResult.publicId;
        }
        const concern = await models_1.Concern.create({
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
        await (0, ranchAlert_service_1.createRanchAlert)({
            ranchId,
            alertType: "concern_raised",
            title: "New concern raised",
            message: `${title} (${category}, ${priority ?? "medium"})`,
            priority: priority === "urgent" ? "high" : priority ?? "medium",
            entityType: "concern",
            entityPublicId: String(concern.getDataValue("public_id")),
            dedupe: false,
        });
        const createdConcern = await models_1.Concern.findOne({
            where: { id: concern.getDataValue("id") },
            include: [
                {
                    model: models_1.User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: models_1.User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Concern raised successfully",
            data: {
                concern: formatConcern(createdConcern),
            },
        }));
    }
    catch (err) {
        console.error("CREATE_CONCERN_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to raise concern",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function listConcerns(req, res) {
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const parsed = concern_validator_1.listConcernsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid query params",
                errors: parsed.error.flatten(),
            }));
        }
        const { page, limit, status, priority, category, raisedByMe, assignedToMe, search, sortBy, sortOrder, } = parsed.data;
        const offset = (page - 1) * limit;
        const baseWhere = {
            ranch_id: ranchId,
        };
        if (!canManageConcern(ranchRole)) {
            baseWhere[sequelize_1.Op.or] = [
                { raised_by_user_id: userId },
                { assigned_to_user_id: userId },
            ];
        }
        const where = {
            ...baseWhere,
        };
        if (status)
            where.status = status;
        if (priority)
            where.priority = priority;
        if (category)
            where.category = category;
        if (raisedByMe)
            where.raised_by_user_id = userId;
        if (assignedToMe)
            where.assigned_to_user_id = userId;
        if (search) {
            where[sequelize_1.Op.and] = where[sequelize_1.Op.and] ?? [];
            where[sequelize_1.Op.and].push({
                [sequelize_1.Op.or]: [
                    { title: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { description: { [sequelize_1.Op.iLike]: `%${search}%` } },
                ],
            });
        }
        let order = [["created_at", sortOrder.toUpperCase()]];
        if (sortBy === "priority")
            order = [["priority", sortOrder.toUpperCase()]];
        if (sortBy === "status")
            order = [["status", sortOrder.toUpperCase()]];
        const { count, rows } = await models_1.Concern.findAndCountAll({
            where,
            include: [
                {
                    model: models_1.User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: models_1.User,
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
        const [openCount, inReviewCount, resolvedCount, dismissedCount] = await Promise.all([
            models_1.Concern.count({
                where: {
                    ...baseWhere,
                    status: "open",
                },
            }),
            models_1.Concern.count({
                where: {
                    ...baseWhere,
                    status: "in_review",
                },
            }),
            models_1.Concern.count({
                where: {
                    ...baseWhere,
                    status: "resolved",
                },
            }),
            models_1.Concern.count({
                where: {
                    ...baseWhere,
                    status: "dismissed",
                },
            }),
        ]);
        const totalCount = openCount + inReviewCount + resolvedCount + dismissedCount;
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Concerns fetched successfully",
            data: {
                concerns: rows.map((concern) => formatConcern(concern)),
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
        }));
    }
    catch (err) {
        console.error("LIST_CONCERNS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch concerns",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function getConcernByPublicId(req, res) {
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { concernPublicId } = req.params;
        const concern = await models_1.Concern.findOne({
            where: {
                public_id: concernPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: models_1.User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: models_1.User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!concern) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Concern not found",
            }));
        }
        const raisedByUserId = concern.getDataValue("raised_by_user_id");
        const assignedToUserId = concern.getDataValue("assigned_to_user_id");
        if (!canManageConcern(ranchRole) &&
            raisedByUserId !== userId &&
            assignedToUserId !== userId) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to view this concern",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Concern fetched successfully",
            data: {
                concern: formatConcern(concern),
            },
        }));
    }
    catch (err) {
        console.error("GET_CONCERN_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch concern",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function updateConcern(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { concernPublicId } = req.params;
        if (!canManageConcern(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only owner or manager can update concerns",
            }));
        }
        const parsed = concern_validator_1.updateConcernSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const concern = await models_1.Concern.findOne({
            where: {
                public_id: concernPublicId,
                ranch_id: ranchId,
            },
        });
        if (!concern) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Concern not found",
            }));
        }
        const { status, priority, assignedToUserPublicId, resolutionNotes } = parsed.data;
        let assignedToUserId = undefined;
        if (assignedToUserPublicId !== undefined) {
            if (assignedToUserPublicId === null) {
                assignedToUserId = null;
            }
            else {
                const assignedUser = await models_1.User.findOne({
                    where: { id: assignedToUserPublicId },
                });
                if (!assignedUser) {
                    return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                        message: "Assigned user not found",
                    }));
                }
                const assignedMembership = await models_1.RanchMember.findOne({
                    where: {
                        ranch_id: ranchId,
                        user_id: assignedUser.getDataValue("id"),
                    },
                });
                if (!assignedMembership) {
                    return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                        message: "Assigned user is not a member of this ranch",
                    }));
                }
                assignedToUserId = assignedUser.getDataValue("id");
            }
        }
        const updates = {};
        if (status !== undefined)
            updates.status = status;
        if (priority !== undefined)
            updates.priority = priority;
        if (assignedToUserId !== undefined)
            updates.assigned_to_user_id = assignedToUserId;
        if (resolutionNotes !== undefined)
            updates.resolution_notes = resolutionNotes;
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
            await (0, ranchAlert_service_1.createRanchAlert)({
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
        const updatedConcern = await models_1.Concern.findOne({
            where: { id: concern.getDataValue("id") },
            include: [
                {
                    model: models_1.User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: models_1.User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Concern updated successfully",
            data: {
                concern: formatConcern(updatedConcern),
            },
        }));
    }
    catch (err) {
        console.error("UPDATE_CONCERN_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to update concern",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function uploadConcernImage(req, res) {
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { concernPublicId } = req.params;
        if (!req.file) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Image file is required",
            }));
        }
        const concern = await models_1.Concern.findOne({
            where: {
                public_id: concernPublicId,
                ranch_id: ranchId,
            },
        });
        if (!concern) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Concern not found",
            }));
        }
        const raisedByUserId = concern.getDataValue("raised_by_user_id");
        if (!canManageConcern(ranchRole) && raisedByUserId !== userId) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to upload image for this concern",
            }));
        }
        const oldImagePublicId = concern.getDataValue("image_public_id");
        if (oldImagePublicId) {
            await (0, cloudinary_service_1.deleteFromCloudinary)(String(oldImagePublicId));
        }
        const uploadResult = await (0, cloudinary_service_1.uploadBufferToCloudinary)(req.file.buffer, `smartruga/concerns/${ranchId}`, `concern-${concern.getDataValue("public_id")}`);
        await concern.update({
            image_url: uploadResult.secureUrl,
            image_public_id: uploadResult.publicId,
        });
        const updatedConcern = await models_1.Concern.findOne({
            where: { id: concern.getDataValue("id") },
            include: [
                {
                    model: models_1.User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: models_1.User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Concern image uploaded successfully",
            data: {
                concern: formatConcern(updatedConcern),
            },
        }));
    }
    catch (err) {
        console.error("UPLOAD_CONCERN_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to upload concern image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function removeConcernImage(req, res) {
    try {
        const ranchId = req.ranch.id;
        const userId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { concernPublicId } = req.params;
        const concern = await models_1.Concern.findOne({
            where: {
                public_id: concernPublicId,
                ranch_id: ranchId,
            },
        });
        if (!concern) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Concern not found",
            }));
        }
        const raisedByUserId = concern.getDataValue("raised_by_user_id");
        if (!canManageConcern(ranchRole) && raisedByUserId !== userId) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to remove image from this concern",
            }));
        }
        const oldImagePublicId = concern.getDataValue("image_public_id");
        if (!oldImagePublicId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Concern has no image",
            }));
        }
        await (0, cloudinary_service_1.deleteFromCloudinary)(String(oldImagePublicId));
        await concern.update({
            image_url: null,
            image_public_id: null,
        });
        const updatedConcern = await models_1.Concern.findOne({
            where: { id: concern.getDataValue("id") },
            include: [
                {
                    model: models_1.User,
                    as: "raisedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
                {
                    model: models_1.User,
                    as: "resolvedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Concern image removed successfully",
            data: {
                concern: formatConcern(updatedConcern),
            },
        }));
    }
    catch (err) {
        console.error("REMOVE_CONCERN_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to remove concern image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
