import { v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { cancelTaskSchema, createTaskSchema, updateTaskStatusSchema } from "../validators/task.validator";
import { RanchMember, Task, User } from "../models";
import { errorResponse, successResponse } from "../utils/apiResponse";

function buildUserName(user: any) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

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

function formatTask(task: any) {
    const assignedToUser = task.assignedToUser ?? task.get?.("assignedToUser") ?? null;
    const assignedByUser = task.assignedByUser ?? task.get?.("assignedByUser") ?? null;
    const cancelledByUser = task.cancelledByUser ?? task.get?.("cancelledByUser") ?? null;

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

export async function createTask(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const actorUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;

        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only ranch owners or managers can assign tasks",
                })
            );
        }

        const parsed = createTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const { title, description, assignedToUserPublicId, dueDate } = parsed.data;

        const assignee = await User.findOne({
            where: { id: assignedToUserPublicId },
            attributes: ["id", "first_name", "last_name", "email"],
        });

        if (!assignee) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Assignee not found",
                })
            );
        }

        const membership = await RanchMember.findOne({
            where: {
                ranch_id: ranchId,
                user_id: assignee.getDataValue("id"),
            },
        });

        if (!membership) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Assignee is not a member of this ranch",
                })
            );
        }

        const task = await Task.create({
            ranch_id: ranchId,
            title,
            description: description ?? null,
            image_url: null,
            image_public_id: null,
            assigned_to_user_id: assignee.getDataValue("id"),
            assigned_by_user_id: actorUserId,
            due_date: dueDate ? new Date(dueDate) : null,
        });

        const createdTask = await Task.findOne({
            where: { id: task.getDataValue("id") },
            include: [
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        return res.status(StatusCodes.CREATED).json(
            successResponse({
                message: "Task created successfully",
                data: {
                    task: formatTask(createdTask),
                },
            })
        );
    } catch (err: any) {
        console.error("CREATE_TASK_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to create task",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function listTasks(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const ranchRole = req.membership!.ranchRole;
        const currentUserId = req.user!.id;

        const where: any = {
            ranch_id: ranchId,
            cancelled_at: null,
        };

        if (!["owner", "manager"].includes(ranchRole)) {
            where.assigned_to_user_id = currentUserId;
        }

        const tasks = await Task.findAll({
            where,
            include: [
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
            order: [["created_at", "DESC"]],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Tasks fetched successfully",
                data: {
                    tasks: tasks.map((task: any) => formatTask(task)),
                },
            })
        );
    } catch (err: any) {
        console.error("LIST_TASKS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to list tasks",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function updateTaskStatus(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { taskPublicId } = req.params;

        const parsed = updateTaskStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const task = await Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
        });

        if (!task) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Task not found",
                })
            );
        }

        if (task.getDataValue("cancelled_at")) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Cancelled tasks cannot be updated",
                })
            );
        }

        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        const canManage = ["owner", "manager"].includes(ranchRole);

        if (!isAssignee && !canManage) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "You are not allowed to update this task",
                })
            );
        }

        const nextStatus = parsed.data.status;
        const currentStatus = task.getDataValue("status");

        if (isAssignee && !canManage) {
            const allowedTransitions: Record<string, string[]> = {
                pending: ["in_progress"],
                in_progress: ["completed"],
                completed: [],
            };

            if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
                return res.status(StatusCodes.BAD_REQUEST).json(
                    errorResponse({
                        message: `Workers can only move task status from ${currentStatus} to ${allowedTransitions[currentStatus]?.join(", ") || "no further status"}`,
                    })
                );
            }
        }

        task.setDataValue("status", nextStatus);
        await task.save();

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Task status updated successfully",
                data: {
                    task: {
                        publicId: task.getDataValue("public_id"),
                        status: task.getDataValue("status"),
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("UPDATE_TASK_STATUS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to update task status",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function cancelTask(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { taskPublicId } = req.params;

        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only ranch owners or managers can cancel tasks",
                })
            );
        }

        const parsed = cancelTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                })
            );
        }

        const task = await Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
        });

        if (!task) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Task not found",
                })
            );
        }

        if (task.getDataValue("cancelled_at")) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Task is already cancelled",
                })
            );
        }

        if (task.getDataValue("status") === "completed") {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Completed tasks cannot be cancelled",
                })
            );
        }

        task.setDataValue("cancelled_at", new Date());
        task.setDataValue("cancelled_by_user_id", currentUserId);
        task.setDataValue("cancel_reason", parsed.data.reason ?? null);

        await task.save();

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Task cancelled successfully",
                data: {
                    task: {
                        publicId: task.getDataValue("public_id"),
                        status: task.getDataValue("status"),
                        cancelledAt: task.getDataValue("cancelled_at"),
                        cancelReason: task.getDataValue("cancel_reason"),
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("CANCEL_TASK_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to cancel task",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function getTaskByPublicId(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { taskPublicId } = req.params;

        const canManage = ["owner", "manager"].includes(ranchRole);

        const task = await Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "cancelledByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        if (!task) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Task not found",
                })
            );
        }

        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;

        if (!canManage && !isAssignee) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "You are not allowed to view this task",
                })
            );
        }

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Task fetched successfully",
                data: {
                    task: formatTask(task),
                },
            })
        );
    } catch (err: any) {
        console.error("GET_TASK_BY_PUBLIC_ID_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch task",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function uploadTaskImage(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const ranchRole = req.membership!.ranchRole;
        const { taskPublicId } = req.params;

        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only ranch owners or managers can upload task images",
                })
            );
        }

        if (!req.file) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Image file is required",
                })
            );
        }

        const task = await Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "cancelledByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        if (!task) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Task not found",
                })
            );
        }

        const oldImagePublicId = task.getDataValue("image_public_id");
        if (oldImagePublicId) {
            await cloudinary.uploader.destroy(String(oldImagePublicId));
        }

        const uploadResult = await uploadBufferToCloudinary(
            req.file.buffer,
            `smartruga/tasks/${ranchId}`,
            `task-${task.getDataValue("public_id")}`
        );

        await task.update({
            image_url: uploadResult.secure_url,
            image_public_id: uploadResult.public_id,
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Task image uploaded successfully",
                data: {
                    task: formatTask(task),
                },
            })
        );
    } catch (err: any) {
        console.error("UPLOAD_TASK_IMAGE_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to upload task image",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function removeTaskImage(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const ranchRole = req.membership!.ranchRole;
        const { taskPublicId } = req.params;

        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only ranch owners or managers can remove task images",
                })
            );
        }

        const task = await Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
            include: [
                {
                    model: User,
                    as: "assignedToUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "assignedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "cancelledByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        if (!task) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Task not found",
                })
            );
        }

        const imagePublicId = task.getDataValue("image_public_id");
        if (!imagePublicId) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Task has no image",
                })
            );
        }

        await cloudinary.uploader.destroy(String(imagePublicId));

        await task.update({
            image_url: null,
            image_public_id: null,
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Task image removed successfully",
                data: {
                    task: formatTask(task),
                },
            })
        );
    } catch (err: any) {
        console.error("REMOVE_TASK_IMAGE_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to remove task image",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}