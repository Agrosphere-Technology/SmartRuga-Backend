import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
    createTaskSubmissionSchema,
    reviewTaskSubmissionSchema,
} from "../validators/task-submission.validator";
import { Task, TaskSubmission, User } from "../models";
import { errorResponse, successResponse } from "../utils/apiResponse";

function buildUserName(user: any) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

export async function createTaskSubmission(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const { taskPublicId } = req.params;

        const parsed = createTaskSubmissionSchema.safeParse(req.body);
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
                    message: "Cancelled tasks cannot receive submissions",
                })
            );
        }

        if (task.getDataValue("status") === "completed") {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Completed tasks cannot receive new submissions",
                })
            );
        }

        const isAssignee =
            task.getDataValue("assigned_to_user_id") === currentUserId;

        if (!isAssignee) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only the assigned user can submit proof for this task",
                })
            );
        }

        const existingPendingSubmission = await TaskSubmission.findOne({
            where: {
                task_id: task.getDataValue("id"),
                status: "pending",
            },
        });

        if (existingPendingSubmission) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "This task already has a pending submission awaiting review",
                })
            );
        }

        const { proofType, proofUrl, notes } = parsed.data;

        const submission = await TaskSubmission.create({
            task_id: task.getDataValue("id"),
            submitted_by_user_id: currentUserId,
            proof_type: proofType,
            proof_url: proofUrl ?? null,
            notes: notes ?? null,
            status: "pending",
        });

        if (task.getDataValue("status") === "pending") {
            task.setDataValue("status", "in_progress");
            await task.save();
        }

        return res.status(StatusCodes.CREATED).json(
            successResponse({
                message: "Task submission created successfully",
                data: {
                    submission: {
                        publicId: submission.getDataValue("public_id"),
                        taskPublicId: task.getDataValue("public_id"),
                        proofType: submission.getDataValue("proof_type"),
                        proofUrl: submission.getDataValue("proof_url"),
                        notes: submission.getDataValue("notes"),
                        status: submission.getDataValue("status"),
                        createdAt: submission.getDataValue("created_at"),
                    },
                    task: {
                        publicId: task.getDataValue("public_id"),
                        status: task.getDataValue("status"),
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("CREATE_TASK_SUBMISSION_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to create task submission",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function listTaskSubmissions(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { taskPublicId } = req.params;

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

        const isAssignee =
            task.getDataValue("assigned_to_user_id") === currentUserId;
        const canManage = ["owner", "manager"].includes(ranchRole);

        if (!isAssignee && !canManage) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "You are not allowed to view submissions for this task",
                })
            );
        }

        const submissions = await TaskSubmission.findAll({
            where: {
                task_id: task.getDataValue("id"),
            },
            include: [
                {
                    model: User,
                    as: "submittedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "reviewedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
            order: [["created_at", "DESC"]],
        });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Task submissions fetched successfully",
                data: {
                    task: {
                        publicId: task.getDataValue("public_id"),
                        status: task.getDataValue("status"),
                    },
                    submissions: submissions.map((submission: any) => ({
                        publicId: submission.public_id,
                        proofType: submission.proof_type,
                        proofUrl: submission.proof_url,
                        notes: submission.notes,
                        status: submission.status,
                        reviewNotes: submission.review_notes,
                        reviewedAt: submission.reviewed_at,
                        createdAt: submission.created_at,
                        submittedBy: submission.submittedByUser
                            ? {
                                publicId: submission.submittedByUser.id,
                                name: buildUserName(submission.submittedByUser),
                                email: submission.submittedByUser.email,
                            }
                            : null,
                        reviewedBy: submission.reviewedByUser
                            ? {
                                publicId: submission.reviewedByUser.id,
                                name: buildUserName(submission.reviewedByUser),
                                email: submission.reviewedByUser.email,
                            }
                            : null,
                    })),
                },
            })
        );
    } catch (err: any) {
        console.error("LIST_TASK_SUBMISSIONS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to list task submissions",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function reviewTaskSubmission(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { taskPublicId, submissionPublicId } = req.params;

        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only ranch owners or managers can review submissions",
                })
            );
        }

        const parsed = reviewTaskSubmissionSchema.safeParse(req.body);
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
                    message: "Cancelled tasks cannot be reviewed",
                })
            );
        }

        const submission = await TaskSubmission.findOne({
            where: {
                public_id: submissionPublicId,
                task_id: task.getDataValue("id"),
            },
        });

        if (!submission) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Submission not found",
                })
            );
        }

        if (submission.getDataValue("status") !== "pending") {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Only pending submissions can be reviewed",
                })
            );
        }

        const { status, reviewNotes } = parsed.data;

        submission.setDataValue("status", status);
        submission.setDataValue("review_notes", reviewNotes ?? null);
        submission.setDataValue("reviewed_by_user_id", currentUserId);
        submission.setDataValue("reviewed_at", new Date());

        await submission.save();

        if (status === "approved") {
            task.setDataValue("status", "completed");
        } else {
            task.setDataValue("status", "in_progress");
        }

        await task.save();

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: `Task submission ${status} successfully`,
                data: {
                    submission: {
                        publicId: submission.getDataValue("public_id"),
                        status: submission.getDataValue("status"),
                        reviewNotes: submission.getDataValue("review_notes"),
                        reviewedAt: submission.getDataValue("reviewed_at"),
                    },
                    task: {
                        publicId: task.getDataValue("public_id"),
                        status: task.getDataValue("status"),
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("REVIEW_TASK_SUBMISSION_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to review task submission",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function getTaskSubmissionByPublicId(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const currentUserId = req.user!.id;
        const ranchRole = req.membership!.ranchRole;
        const { taskPublicId, submissionPublicId } = req.params;

        const canManage = ["owner", "manager"].includes(ranchRole);

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

        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;

        if (!canManage && !isAssignee) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "You are not allowed to view this submission",
                })
            );
        }

        const submission = await TaskSubmission.findOne({
            where: {
                public_id: submissionPublicId,
                task_id: task.getDataValue("id"),
            },
            include: [
                {
                    model: User,
                    as: "submittedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: User,
                    as: "reviewedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });

        if (!submission) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Submission not found",
                })
            );
        }

        const submissionData = submission as any;

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Task submission fetched successfully",
                data: {
                    task: {
                        publicId: task.getDataValue("public_id"),
                        title: task.getDataValue("title"),
                        status: task.getDataValue("status"),
                    },
                    submission: {
                        publicId: submission.getDataValue("public_id"),
                        proofType: submission.getDataValue("proof_type"),
                        proofUrl: submission.getDataValue("proof_url"),
                        notes: submission.getDataValue("notes"),
                        status: submission.getDataValue("status"),
                        reviewNotes: submission.getDataValue("review_notes"),
                        reviewedAt: submission.getDataValue("reviewed_at"),
                        createdAt: submission.getDataValue("created_at"),
                        updatedAt: submission.getDataValue("updated_at"),
                        submittedBy: submissionData.submittedByUser
                            ? {
                                publicId: submissionData.submittedByUser.id,
                                name: buildUserName(submissionData.submittedByUser),
                                email: submissionData.submittedByUser.email,
                            }
                            : null,
                        reviewedBy: submissionData.reviewedByUser
                            ? {
                                publicId: submissionData.reviewedByUser.id,
                                name: buildUserName(submissionData.reviewedByUser),
                                email: submissionData.reviewedByUser.email,
                            }
                            : null,
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("GET_TASK_SUBMISSION_BY_PUBLIC_ID_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch task submission",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}