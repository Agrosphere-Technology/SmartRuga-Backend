import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { RanchMember, User } from "../models";
import { errorResponse, successResponse } from "../utils/apiResponse";

function getSingleParam(param: string | string[] | undefined) {
    if (!param) return undefined;
    return Array.isArray(param) ? param[0] : param;
}

// ===============================
// LIST MEMBERS
// ===============================
export async function listRanchMembers(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;

        const members = await RanchMember.findAll({
            where: { ranch_id: ranchId },
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: [
                        "id",
                        "first_name",
                        "last_name",
                        "email",
                        "phone",
                        "image_url",
                        "platform_role",
                        "is_active",
                    ],
                },
            ],
            order: [["created_at", "DESC"]],
        });

        const formatted = members.map((m: any) => ({
            memberId: m.get("id"),
            ranchRole: m.get("role"),
            status: m.get("status"),
            createdAt: m.get("created_at"),

            user: m.user
                ? {
                    id: m.user.get("id"),
                    firstName: m.user.get("first_name"),
                    lastName: m.user.get("last_name"),
                    email: m.user.get("email"),
                    phone: m.user.get("phone"),
                    imageUrl: m.user.get("image_url"),
                    platformRole: m.user.get("platform_role"),
                    isActive: m.user.get("is_active"),
                }
                : null,
        }));

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Ranch members fetched successfully",
                data: { members: formatted },
            })
        );
    } catch (err: any) {
        console.error("LIST_RANCH_MEMBERS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch ranch members",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// ===============================
// UPDATE ROLE
// ===============================
export async function updateRanchMemberRole(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const requesterRole = req.membership!.ranchRole;

        const memberId = getSingleParam(req.params.memberId);
        const { ranchRole } = req.body;

        if (!memberId || !ranchRole) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "memberId and ranchRole are required",
                })
            );
        }

        const member = await RanchMember.findOne({
            where: { id: memberId, ranch_id: ranchId },
        });

        if (!member) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({ message: "Member not found" })
            );
        }

        const currentRole = member.get("role");

        // 🔒 Only owner & manager
        if (!["owner", "manager"].includes(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only owner or manager can update roles",
                })
            );
        }

        // ❌ Cannot change owner
        if (currentRole === "owner") {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Owner role cannot be changed",
                })
            );
        }

        // ❌ Cannot assign owner
        if (ranchRole === "owner") {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Cannot assign owner role",
                })
            );
        }

        // ❌ Manager cannot change another manager
        if (requesterRole === "manager" && currentRole === "manager") {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Managers cannot modify another manager",
                })
            );
        }

        await member.update({ role: ranchRole });

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Ranch member role updated successfully",
                data: {
                    memberId: member.get("id"),
                    newRole: ranchRole,
                },
            })
        );
    } catch (err: any) {
        console.error("UPDATE_RANCH_MEMBER_ROLE_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to update role",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

// ===============================
// REMOVE MEMBER / LEAVE
// ===============================
export async function removeRanchMember(req: Request, res: Response) {
    try {
        const ranchId = req.ranch!.id;
        const requesterRole = req.membership!.ranchRole;
        const currentUserId = req.user!.id;

        const memberId = getSingleParam(req.params.memberId);

        if (!memberId) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({ message: "memberId is required" })
            );
        }

        const member = await RanchMember.findOne({
            where: { id: memberId, ranch_id: ranchId },
        });

        if (!member) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({ message: "Member not found" })
            );
        }

        const targetRole = member.get("role");
        const targetUserId = member.get("user_id");

        // ===============================
        // SELF LEAVE
        // ===============================
        if (targetUserId === currentUserId) {
            if (targetRole === "owner") {
                return res.status(StatusCodes.FORBIDDEN).json(
                    errorResponse({ message: "Owner cannot leave the ranch" })
                );
            }

            await member.destroy();

            return res.status(StatusCodes.OK).json(
                successResponse({
                    message: "You have left the ranch successfully",
                })
            );
        }

        // ===============================
        // REMOVE OTHERS
        // ===============================
        if (!["owner", "manager"].includes(requesterRole)) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only owner or manager can remove members",
                })
            );
        }

        if (targetRole === "owner") {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Owner cannot be removed",
                })
            );
        }

        if (requesterRole === "manager" && targetRole === "manager") {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Managers cannot remove another manager",
                })
            );
        }

        await member.destroy();

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Member removed from ranch successfully",
                data: {
                    memberId: member.get("id"),
                },
            })
        );
    } catch (err: any) {
        console.error("REMOVE_RANCH_MEMBER_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to remove member",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}