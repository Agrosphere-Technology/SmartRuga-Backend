"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTaskSubmission = createTaskSubmission;
exports.listTaskSubmissions = listTaskSubmissions;
exports.reviewTaskSubmission = reviewTaskSubmission;
exports.getTaskSubmissionByPublicId = getTaskSubmissionByPublicId;
exports.uploadTaskSubmissionImage = uploadTaskSubmissionImage;
exports.removeTaskSubmissionImage = removeTaskSubmissionImage;
const cloudinary_1 = require("cloudinary");
const http_status_codes_1 = require("http-status-codes");
const task_submission_validator_1 = require("../validators/task-submission.validator");
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
function formatTaskSubmission(submission, task) {
    const submittedByUser = submission.submittedByUser ?? submission.get?.("submittedByUser") ?? null;
    const reviewedByUser = submission.reviewedByUser ?? submission.get?.("reviewedByUser") ?? null;
    return {
        publicId: submission.getDataValue?.("public_id") ?? submission.public_id,
        taskPublicId: task?.getDataValue?.("public_id") ?? task?.public_id ?? null,
        proofType: submission.getDataValue?.("proof_type") ?? submission.proof_type,
        proofUrl: submission.getDataValue?.("proof_url") ?? submission.proof_url,
        imageUrl: submission.getDataValue?.("image_url") ?? submission.image_url ?? null,
        imagePublicId: submission.getDataValue?.("image_public_id") ??
            submission.image_public_id ??
            null,
        notes: submission.getDataValue?.("notes") ?? submission.notes,
        status: submission.getDataValue?.("status") ?? submission.status,
        reviewNotes: submission.getDataValue?.("review_notes") ?? submission.review_notes,
        reviewedAt: submission.getDataValue?.("reviewed_at") ?? submission.reviewed_at,
        createdAt: submission.getDataValue?.("created_at") ?? submission.created_at,
        updatedAt: submission.getDataValue?.("updated_at") ?? submission.updated_at,
        submittedBy: submittedByUser
            ? {
                publicId: submittedByUser.id,
                name: buildUserName(submittedByUser),
                email: submittedByUser.email,
            }
            : null,
        reviewedBy: reviewedByUser
            ? {
                publicId: reviewedByUser.id,
                name: buildUserName(reviewedByUser),
                email: reviewedByUser.email,
            }
            : null,
    };
}
async function createTaskSubmission(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const { taskPublicId } = req.params;
        const payload = {
            ...req.body,
            proofType: req.file ? "image" : req.body.proofType,
        };
        const parsed = task_submission_validator_1.createTaskSubmissionSchema.safeParse(payload);
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
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        if (task.getDataValue("cancelled_at")) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Cancelled tasks cannot receive submissions",
            }));
        }
        if (task.getDataValue("status") === "completed") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Completed tasks cannot receive new submissions",
            }));
        }
        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        if (!isAssignee) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only the assigned user can submit proof for this task",
            }));
        }
        const existingPendingSubmission = await models_1.TaskSubmission.findOne({
            where: {
                task_id: task.getDataValue("id"),
                status: "pending",
            },
        });
        if (existingPendingSubmission) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "This task already has a pending submission awaiting review",
            }));
        }
        const { proofType, proofUrl, notes } = parsed.data;
        let imageUrl = null;
        let imagePublicId = null;
        let finalProofUrl = proofUrl ?? null;
        if (req.file) {
            const uploadResult = await uploadBufferToCloudinary(req.file.buffer, `smartruga/task-submissions/${ranchId}`, `submission-${Date.now()}-${currentUserId}`);
            imageUrl = uploadResult.secure_url;
            imagePublicId = uploadResult.public_id;
            finalProofUrl = uploadResult.secure_url;
        }
        const submission = await models_1.TaskSubmission.create({
            task_id: task.getDataValue("id"),
            submitted_by_user_id: currentUserId,
            proof_type: proofType,
            proof_url: finalProofUrl,
            image_url: imageUrl,
            image_public_id: imagePublicId,
            notes: notes ?? null,
            status: "pending",
        });
        if (task.getDataValue("status") === "pending") {
            task.setDataValue("status", "in_progress");
            await task.save();
        }
        const createdSubmission = await models_1.TaskSubmission.findOne({
            where: {
                id: submission.getDataValue("id"),
            },
            include: [
                {
                    model: models_1.User,
                    as: "submittedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "reviewedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Task submission created successfully",
            data: {
                submission: formatTaskSubmission(createdSubmission, task),
                task: {
                    publicId: task.getDataValue("public_id"),
                    status: task.getDataValue("status"),
                },
            },
        }));
    }
    catch (err) {
        console.error("CREATE_TASK_SUBMISSION_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to create task submission",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function listTaskSubmissions(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId } = req.params;
        const task = await models_1.Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        const canManage = ["owner", "manager"].includes(ranchRole);
        if (!isAssignee && !canManage) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to view submissions for this task",
            }));
        }
        const submissions = await models_1.TaskSubmission.findAll({
            where: {
                task_id: task.getDataValue("id"),
            },
            include: [
                {
                    model: models_1.User,
                    as: "submittedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "reviewedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
            order: [["created_at", "DESC"]],
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task submissions fetched successfully",
            data: {
                task: {
                    publicId: task.getDataValue("public_id"),
                    status: task.getDataValue("status"),
                },
                submissions: submissions.map((submission) => formatTaskSubmission(submission, task)),
            },
        }));
    }
    catch (err) {
        console.error("LIST_TASK_SUBMISSIONS_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list task submissions",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function reviewTaskSubmission(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId, submissionPublicId } = req.params;
        if (!["owner", "manager"].includes(ranchRole)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Only ranch owners or managers can review submissions",
            }));
        }
        const parsed = task_submission_validator_1.reviewTaskSubmissionSchema.safeParse(req.body);
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
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        if (task.getDataValue("cancelled_at")) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Cancelled tasks cannot be reviewed",
            }));
        }
        const submission = await models_1.TaskSubmission.findOne({
            where: {
                public_id: submissionPublicId,
                task_id: task.getDataValue("id"),
            },
        });
        if (!submission) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Submission not found",
            }));
        }
        if (submission.getDataValue("status") !== "pending") {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Only pending submissions can be reviewed",
            }));
        }
        const { status, reviewNotes } = parsed.data;
        submission.setDataValue("status", status);
        submission.setDataValue("review_notes", reviewNotes ?? null);
        submission.setDataValue("reviewed_by_user_id", currentUserId);
        submission.setDataValue("reviewed_at", new Date());
        await submission.save();
        if (status === "approved") {
            task.setDataValue("status", "completed");
        }
        else {
            task.setDataValue("status", "in_progress");
        }
        await task.save();
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
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
        }));
    }
    catch (err) {
        console.error("REVIEW_TASK_SUBMISSION_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to review task submission",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function getTaskSubmissionByPublicId(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId, submissionPublicId } = req.params;
        const canManage = ["owner", "manager"].includes(ranchRole);
        const task = await models_1.Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        if (!canManage && !isAssignee) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to view this submission",
            }));
        }
        const submission = await models_1.TaskSubmission.findOne({
            where: {
                public_id: submissionPublicId,
                task_id: task.getDataValue("id"),
            },
            include: [
                {
                    model: models_1.User,
                    as: "submittedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "reviewedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!submission) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Submission not found",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task submission fetched successfully",
            data: {
                task: {
                    publicId: task.getDataValue("public_id"),
                    title: task.getDataValue("title"),
                    status: task.getDataValue("status"),
                },
                submission: formatTaskSubmission(submission, task),
            },
        }));
    }
    catch (err) {
        console.error("GET_TASK_SUBMISSION_BY_PUBLIC_ID_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch task submission",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function uploadTaskSubmissionImage(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId, submissionPublicId } = req.params;
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
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        const canManage = ["owner", "manager"].includes(ranchRole);
        if (!isAssignee && !canManage) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to upload image for this submission",
            }));
        }
        const submission = await models_1.TaskSubmission.findOne({
            where: {
                public_id: submissionPublicId,
                task_id: task.getDataValue("id"),
            },
            include: [
                {
                    model: models_1.User,
                    as: "submittedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "reviewedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!submission) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Submission not found",
            }));
        }
        const submissionOwnerId = submission.getDataValue("submitted_by_user_id");
        if (!canManage && submissionOwnerId !== currentUserId) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You can only upload image for your own submission",
            }));
        }
        const oldImagePublicId = submission.getDataValue("image_public_id");
        if (oldImagePublicId) {
            await cloudinary_1.v2.uploader.destroy(String(oldImagePublicId));
        }
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, `smartruga/task-submissions/${ranchId}`, `submission-${submission.getDataValue("public_id")}`);
        await submission.update({
            image_url: uploadResult.secure_url,
            image_public_id: uploadResult.public_id,
            proof_type: "image",
            proof_url: uploadResult.secure_url,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task submission image uploaded successfully",
            data: {
                submission: formatTaskSubmission(submission, task),
            },
        }));
    }
    catch (err) {
        console.error("UPLOAD_TASK_SUBMISSION_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to upload task submission image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function removeTaskSubmissionImage(req, res) {
    try {
        const ranchId = req.ranch.id;
        const currentUserId = req.user.id;
        const ranchRole = req.membership.ranchRole;
        const { taskPublicId, submissionPublicId } = req.params;
        const task = await models_1.Task.findOne({
            where: {
                public_id: taskPublicId,
                ranch_id: ranchId,
            },
        });
        if (!task) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Task not found",
            }));
        }
        const isAssignee = task.getDataValue("assigned_to_user_id") === currentUserId;
        const canManage = ["owner", "manager"].includes(ranchRole);
        if (!isAssignee && !canManage) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You are not allowed to remove image from this submission",
            }));
        }
        const submission = await models_1.TaskSubmission.findOne({
            where: {
                public_id: submissionPublicId,
                task_id: task.getDataValue("id"),
            },
            include: [
                {
                    model: models_1.User,
                    as: "submittedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
                {
                    model: models_1.User,
                    as: "reviewedByUser",
                    attributes: ["id", "first_name", "last_name", "email"],
                    required: false,
                },
            ],
        });
        if (!submission) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Submission not found",
            }));
        }
        const submissionOwnerId = submission.getDataValue("submitted_by_user_id");
        if (!canManage && submissionOwnerId !== currentUserId) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "You can only remove image from your own submission",
            }));
        }
        const imagePublicId = submission.getDataValue("image_public_id");
        if (!imagePublicId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Submission has no image",
            }));
        }
        await cloudinary_1.v2.uploader.destroy(String(imagePublicId));
        await submission.update({
            image_url: null,
            image_public_id: null,
            proof_url: null,
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Task submission image removed successfully",
            data: {
                submission: formatTaskSubmission(submission, task),
            },
        }));
    }
    catch (err) {
        console.error("REMOVE_TASK_SUBMISSION_IMAGE_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to remove task submission image",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
