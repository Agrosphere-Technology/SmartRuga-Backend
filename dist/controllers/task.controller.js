"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTask = createTask;
exports.listTasks = listTasks;
exports.updateTaskStatus = updateTaskStatus;
exports.cancelTask = cancelTask;
exports.getTaskByPublicId = getTaskByPublicId;
exports.uploadTaskImage = uploadTaskImage;
exports.removeTaskImage = removeTaskImage;
const cloudinary_1 = require("cloudinary");
const http_status_codes_1 = require("http-status-codes");
const task_validator_1 = require("../validators/task.validator");
const models_1 = require("../models");
const apiResponse_1 = require("../utils/apiResponse");
function buildUserName(user) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}
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
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function diffInDays(from, to) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay);
}
function getOverdueMeta(task) {
    const dueDateRaw = task.getDataValue?.("due_date") ?? task.due_date ?? null;
    const cancelledAt = task.getDataValue?.("cancelled_at") ?? task.cancelled_at ?? null;
    const status = task.getDataValue?.("status") ?? task.status;
    if (!dueDateRaw || cancelledAt || status === "completed") {
        return {
            isOverdue: false,
            daysOverdue: 0,
        };
    }
    const dueDate = new Date(dueDateRaw);
    const now = new Date();
    const isOverdue = startOfDay(now).getTime() > startOfDay(dueDate).getTime();
    return {
        isOverdue,
        daysOverdue: isOverdue ? Math.abs(diffInDays(dueDate, now)) : 0,
    };
}
function formatTask(task) {
    const assignedToUser = task.assignedToUser ?? task.get?.("assignedToUser") ?? null;
    const assignedByUser = task.assignedByUser ?? task.get?.("assignedByUser") ?? null;
    const cancelledByUser = task.cancelledByUser ?? task.get?.("cancelledByUser") ?? null;
    const overdueMeta = getOverdueMeta(task);
    return {
        publicId: task.getDataValue?.("public_id") ?? task.public_id,
        title: task.getDataValue?.("title") ?? task.title,
        description: task.getDataValue?.("description") ?? task.description,
        imageUrl: task.getDataValue?.("image_url") ?? task.image_url ?? null,
        imagePublicId: task.getDataValue?.("image_public_id") ?? task.image_public_id ?? null,
        status: task.getDataValue?.("status") ?? task.status,
        dueDate: task.getDataValue?.("due_date") ?? task.due_date,
        createdAt: task.getDataValue?.("created_at") ?? task.created_at,
        updatedAt: task.getDataValue?.("updated_at") ?? task.updated_at,
        cancelledAt: task.getDataValue?.("cancelled_at") ?? task.cancelled_at,
        cancelReason: task.getDataValue?.("cancel_reason") ?? task.cancel_reason,
        isOverdue: overdueMeta.isOverdue,
        daysOverdue: overdueMeta.daysOverdue,
        assignedTo: assignedToUser
            ? {
                publicId: assignedToUser.id,
                name: buildUserName(assignedToUser),
                email: assignedToUser.email,
            }
            : null,
        assignedBy: assignedByUser
            ? {
                publicId: assignedByUser.id,
                name: buildUserName(assignedByUser),
                email: assignedByUser.email,
            }
            : null,
        cancelledBy: cancelledByUser
            ? {
                publicId: cancelledByUser.id,
                name: buildUserName(cancelledByUser),
                email: cancelledByUser.email,
            }
            : null,
    };
}
async function createTask(req, res) {
    try {
        const ranchId = req.ranch.id;
        const actorUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only ranch owners or managers can assign tasks",
            }));
        }
        const parsed = task_validator_1.createTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const { title, description, assignedToUserPublicId, dueDate } = parsed.data;
        const assignee = await models_1.User.findOne({
            where: { id: assignedToUserPublicId },
            attributes: ["id", "first_name", "last_name", "email"],
        });
        if (!assignee) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Assignee not found",
            }));
        }
        const membership = await models_1.RanchMember.findOne({
            where: {
                ranch_id: ranchId,
                user_id: assignee.getDataValue("id"),
            },
        });
        if (!membership) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Assignee is not a member of this ranch",
            }));
        }
        const task = await models_1.Task.create({
            ranch_id: ranchId,
            title,
            description: description ?? null,
            image_url: null,
            image_public_id: null,
            assigned_to_user_id: assignee.getDataValue("id"),
            assigned_by_user_id: actorUserId,
            due_date: dueDate ? new Date(dueDate) : null,
        });
        if (req.file) {
            const uploadResult = await uploadBufferToCloudinary(req.file.buffer, `smartruga/tasks/${ranchId}`, `task-${task.getDataValue("public_id")}`);
            await task.update({
                image_url: uploadResult.secure_url,
                image_public_id: uploadResult.public_id,
            });
        }
        const createdTask = await models_1.Task.findOne({
            where: { id: task.getDataValue("id") },
            include: [
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Task created successfully",
            data: {
                task: formatTask(createdTask),
            },
        }));
    }
    catch (err) {
        console.error("CREATE_TASK_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to create task",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function listTasks(req, res) {
    try {
        const ranchId = req.ranch.id;
        const ranchRole = req.membership.ranchRole;
        const currentUserId = req.user.id;
        const where = {
            ranch_id: ranchId,
            cancelled_at: null,
        };
        if (!["owner", "manager"].includes(ranchRole)) {
            where.assigned_to_user_id = currentUserId;
        }
        const tasks = await models_1.Task.findAll({
            where,
            include: [
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
            order: [["created_at", "DESC"]],
        });
        const formattedTasks = tasks.map((task) => formatTask(task));
        const summary = {
            total: formattedTasks.length,
            pending: formattedTasks.filter((task) => task.status === "pending").length,
            inProgress: formattedTasks.filter((task) => task.status === "in_progress")
                .length,
            completed: formattedTasks.filter((task) => task.status === "completed").length,
            overdue: formattedTasks.filter((task) => task.isOverdue).length,
        };
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Tasks fetched successfully",
            data: {
                tasks: formattedTasks,
            },
            meta: {
                summary,
            },
        }));
    }
    catch (err) {
        console.error("LIST_TASKS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list tasks",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function updateTaskStatus(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId } = req.params;
        const parsed = task_validator_1.updateTaskStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const task = await models_1.Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "cancelledByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        if (task.getDataValue("cancelled_at")) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Cancelled tasks cannot be updated",
            }));
        }
        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        const canManage = ["owner", "manager"].includes(ranchRole);
        if (!isAssignee && !canManage) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to update this task",
            }));
        }
        const nextStatus = parsed.data.status;
        const currentStatus = task.getDataValue("status");
        if (isAssignee && !canManage) {
            const allowedTransitions = {
                pending: ["in_progress"],
                in_progress: ["completed"],
                completed: [],
            };
            if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                    message: `Workers can only move task status from ${currentStatus} to ${allowedTransitions[currentStatus]?.join(", ") || "no further status"}`,
                }));
            }
        }
        task.setDataValue("status", nextStatus);
        await task.save();
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task status updated successfully",
            data: {
                task: formatTask(task),
                history: {
                    previousStatus: currentStatus,
                    currentStatus: nextStatus,
                    changedAt: new Date(),
                },
            },
        }));
    }
    catch (err) {
        console.error("UPDATE_TASK_STATUS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to update task status",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function cancelTask(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId } = req.params;
        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only ranch owners or managers can cancel tasks",
            }));
        }
        const parsed = task_validator_1.cancelTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            }));
        }
        const task = await models_1.Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "cancelledByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        if (task.getDataValue("cancelled_at")) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Task is already cancelled",
            }));
        }
        if (task.getDataValue("status") === "completed") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Completed tasks cannot be cancelled",
            }));
        }
        task.setDataValue("cancelled_at", new Date());
        task.setDataValue("cancelled_by_user_id", currentUserId);
        task.setDataValue("cancel_reason", parsed.data.reason ?? null);
        await task.save();
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task cancelled successfully",
            data: {
                task: formatTask(task),
                history: {
                    cancelledAt: task.getDataValue("cancelled_at"),
                    cancelReason: task.getDataValue("cancel_reason"),
                },
            },
        }));
    }
    catch (err) {
        console.error("CANCEL_TASK_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to cancel task",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function getTaskByPublicId(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId } = req.params;
        const canManage = ["owner", "manager"].includes(ranchRole);
        const task = await models_1.Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "cancelledByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        if (!canManage && !isAssignee) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to view this task",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task fetched successfully",
            data: {
                task: formatTask(task),
            },
        }));
    }
    catch (err) {
        console.error("GET_TASK_BY_PUBLIC_ID_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch task",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function uploadTaskImage(req, res) {
    try {
        const ranchId = req.ranch.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId } = req.params;
        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only ranch owners or managers can upload task images",
            }));
        }
        if (!req.file) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Image file is required",
            }));
        }
        const task = await models_1.Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "cancelledByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        const oldImagePublicId = task.getDataValue("image_public_id");
        if (oldImagePublicId) {
            await cloudinary_1.v2.uploader.destroy(String(oldImagePublicId));
        }
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, `smartruga/tasks/${ranchId}`, `task-${task.getDataValue("public_id")}`);
        await task.update({
            image_url: uploadResult.secure_url,
            image_public_id: uploadResult.public_id,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task image uploaded successfully",
            data: {
                task: formatTask(task),
            },
        }));
    }
    catch (err) {
        console.error("UPLOAD_TASK_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to upload task image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function removeTaskImage(req, res) {
    try {
        const ranchId = req.ranch.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId } = req.params;
        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only ranch owners or managers can remove task images",
            }));
        }
        const task = await models_1.Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: models_1.User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "cancelledByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        const imagePublicId = task.getDataValue("image_public_id");
        if (!imagePublicId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Task has no image",
            }));
        }
        await cloudinary_1.v2.uploader.destroy(String(imagePublicId));
        await task.update({
            image_url: null,
            image_public_id: null,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task image removed successfully",
            data: {
                task: formatTask(task),
            },
        }));
    }
    catch (err) {
        console.error("REMOVE_TASK_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to remove task image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
