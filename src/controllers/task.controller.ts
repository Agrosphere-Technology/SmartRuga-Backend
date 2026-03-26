import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { createTaskSchema, updateTaskStatusSchema } from "../validators/task.validator";
import { RanchMember, Task, User } from "../models";

function buildUserName(user: any) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

export async function createTask(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const actorUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;

        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "Only ranch owners or managers can assign tasks",
            });
        }

        const parsed = createTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            });
        }

        const { title, description, assignedToUserPublicId, dueDate } = parsed.data;

        const assignee = await User.findOne({
            where: { id: assignedToUserPublicId },
            attributes: ["id", "first_name", "last_name", "email"],
        });

        if (!assignee) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Assignee not found",
            });
        }

        const membership = await RanchMember.findOne({
            where: {
                ranch_id: ranchId,
                user_id: assignee.getDataValue("id"),
            },
        });

        if (!membership) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Assignee is not a member of this ranch",
            });
        }

        const task = await Task.create({
            ranch_id: ranchId,
            title,
            description: description ?? null,
            assigned_to_user_id: assignee.getDataValue("id"),
            assigned_by_user_id: actorUserId,
            due_date: dueDate ? new Date(dueDate) : null,
        });

        return res.status(StatusCodes.CREATED).json({
            message: "Task created successfully",
            task: {
                publicId: task.getDataValue("public_id"),
                title: task.getDataValue("title"),
                description: task.getDataValue("description"),
                status: task.getDataValue("status"),
                dueDate: task.getDataValue("due_date"),
                assignedTo: {
                    publicId: assignee.getDataValue("id"),
                    name: buildUserName(assignee),
                    email: assignee.getDataValue("email"),
                },
            },
        });
    } catch (err: any) {
        console.error("CREATE_TASK_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to create task",
            error: err?.message ?? "Unknown error",
        });
    }
}

export async function listTasks(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const ranchRole = req.membership!.ranchRole;
        const currentUserId = req.user!.id;

        const where: any = { ranch_id: ranchId };

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

        return res.status(StatusCodes.OK).json({
            tasks: tasks.map((task: any) => ({
                publicId: task.public_id,
                title: task.title,
                description: task.description,
                status: task.status,
                dueDate: task.due_date,
                createdAt: task.created_at,
                assignedTo: task.assignedToUser
                    ? {
                        publicId: task.assignedToUser.id,
                        name: buildUserName(task.assignedToUser),
                        email: task.assignedToUser.email,
                    }
                    : null,
                assignedBy: task.assignedByUser
                    ? {
                        publicId: task.assignedByUser.id,
                        name: buildUserName(task.assignedByUser),
                        email: task.assignedByUser.email,
                    }
                    : null,
            })),
        });
    } catch (err: any) {
        console.error("LIST_TASKS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list tasks",
            error: err?.message ?? "Unknown error",
        });
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
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Validation failed",
                errors: parsed.error.flatten(),
            });
        }

        const task = await Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
        });

        if (!task) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Task not found",
            });
        }

        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        const canManage = ["owner", "manager"].includes(ranchRole);

        if (!isAssignee && !canManage) {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "You are not allowed to update this task",
            });
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
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: `Workers can only move task status from ${currentStatus} to ${allowedTransitions[currentStatus]?.join(", ") || "no further status"}`,
                });
            }
        }

        task.setDataValue("status", nextStatus);
        await task.save();

        return res.status(StatusCodes.OK).json({
            message: "Task status updated successfully",
            task: {
                publicId: task.getDataValue("public_id"),
                status: task.getDataValue("status"),
            },
        });
    } catch (err: any) {
        console.error("UPDATE_TASK_STATUS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to update task status",
            error: err?.message ?? "Unknown error",
        });
    }
}