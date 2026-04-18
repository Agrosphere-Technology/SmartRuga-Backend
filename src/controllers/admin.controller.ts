import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { User, RanchMember, Ranch } from "../models";
import { PLATFORM_ROLES } from "../constants/roles";
import { updateRoleSchema } from "../validators/auth.validator";
import { errorResponse, successResponse } from "../utils/apiResponse";

function getSingleParam(param: string | string[] | undefined) {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

function formatUserForAdmin(user: any, memberships: any[] = []) {
  return {
    id: user.get("id"),
    firstName: user.get("first_name"),
    lastName: user.get("last_name"),
    email: user.get("email"),
    phone: user.get("phone"),
    imageUrl: user.get("image_url"),
    imagePublicId: user.get("image_public_id"),
    platformRole: user.get("platform_role"),
    isActive: user.get("is_active"),
    deletedAt: user.get("deleted_at"),
    createdAt: user.get("created_at"),
    updatedAt: user.get("updated_at"),
    memberships: memberships.map((membership: any) => ({
      memberId: membership.get("id"),
      ranchId: membership.get("ranch_id"),
      ranchName: membership.ranch?.get("name") ?? null,
      ranchSlug: membership.ranch?.get("slug") ?? null,
      ranchRole: membership.get("role"),
      status: membership.get("status") ?? null,
      createdAt: membership.get("created_at"),
      updatedAt: membership.get("updated_at"),
    })),
  };
}

export async function listAllUsers(req: Request, res: Response) {
  try {
    const requester = req.user!;
    const requesterRole = requester.platformRole;

    if (requesterRole !== PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only super_admin can view all users",
        })
      );
    }

    const users = await User.findAll({
      order: [["created_at", "DESC"]],
    });

    const memberships = await RanchMember.findAll({
      include: [
        {
          model: Ranch,
          as: "ranch",
          attributes: ["id", "name", "slug"],
        },
      ],
      order: [["created_at", "DESC"]],
    } as any);

    const membershipsByUserId = new Map<string, any[]>();

    for (const membership of memberships as any[]) {
      const userId = membership.get("user_id");

      if (!membershipsByUserId.has(userId)) {
        membershipsByUserId.set(userId, []);
      }

      membershipsByUserId.get(userId)!.push(membership);
    }

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Users fetched successfully",
        data: {
          users: users.map((user: any) =>
            formatUserForAdmin(user, membershipsByUserId.get(user.get("id")) ?? [])
          ),
        },
      })
    );
  } catch (err: any) {
    console.error("LIST_ALL_USERS_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to fetch users",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function getUserByIdForAdmin(req: Request, res: Response) {
  try {
    const requester = req.user!;
    const requesterRole = requester.platformRole;

    if (requesterRole !== PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only super_admin can view user details",
        })
      );
    }

    const id = getSingleParam(req.params.id);

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "User id is required",
        })
      );
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const memberships = await RanchMember.findAll({
      where: { user_id: id },
      include: [
        {
          model: Ranch,
          as: "ranch",
          attributes: ["id", "name", "slug"],
        },
      ],
      order: [["created_at", "DESC"]],
    } as any);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "User fetched successfully",
        data: {
          user: formatUserForAdmin(user, memberships as any[]),
        },
      })
    );
  } catch (err: any) {
    console.error("GET_USER_BY_ID_FOR_ADMIN_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to fetch user",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function updateUserPlatformRole(req: Request, res: Response) {
  try {
    const parsed = updateRoleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid platformRole",
          errors: parsed.error.issues,
        })
      );
    }

    const targetUserId = getSingleParam(req.params.id);

    if (!targetUserId) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Target user id is required",
        })
      );
    }

    const newRole = parsed.data
      .platformRole as (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

    const requester = req.user!;
    const requesterRole = requester.platformRole;

    const target = await User.findByPk(targetUserId);

    if (!target) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const targetRole = target.get(
      "platform_role"
    ) as (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

    if (targetRole === PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Cannot modify a super_admin",
        })
      );
    }

    if (
      newRole === PLATFORM_ROLES.SUPER_ADMIN &&
      requesterRole !== PLATFORM_ROLES.SUPER_ADMIN
    ) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only super_admin can assign super_admin role",
        })
      );
    }

    if (
      requesterRole === PLATFORM_ROLES.ADMIN &&
      targetRole === PLATFORM_ROLES.ADMIN
    ) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Admins cannot change other admins",
        })
      );
    }

    await target.update({ platform_role: newRole });

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "User platform role updated successfully",
        data: {
          user: {
            id: target.get("id"),
            email: target.get("email"),
            platformRole: target.get("platform_role"),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("UPDATE_USER_ROLE_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to update user role",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function deactivateUser(req: Request, res: Response) {
  try {
    const requester = req.user!;
    const requesterRole = requester.platformRole;

    if (requesterRole !== PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only super_admin can deactivate users",
        })
      );
    }

    const id = getSingleParam(req.params.id);

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "User id is required",
        })
      );
    }

    const target = await User.findByPk(id);

    if (!target) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const targetRole = target.get(
      "platform_role"
    ) as (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

    if (targetRole === PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Cannot deactivate a super_admin",
        })
      );
    }

    await target.update({
      is_active: false,
    });

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "User deactivated successfully",
        data: {
          user: {
            id: target.get("id"),
            email: target.get("email"),
            isActive: target.get("is_active"),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("DEACTIVATE_USER_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to deactivate user",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const requester = req.user!;
    const requesterRole = requester.platformRole;

    if (requesterRole !== PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only super_admin can delete users",
        })
      );
    }

    const id = getSingleParam(req.params.id);

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "User id is required",
        })
      );
    }

    const target = await User.findByPk(id);

    if (!target) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "User not found",
        })
      );
    }

    const targetRole = target.get(
      "platform_role"
    ) as (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

    if (targetRole === PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Cannot delete a super_admin",
        })
      );
    }

    await target.update({
      is_active: false,
      deleted_at: new Date(),
    });

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "User deleted successfully",
        data: {
          user: {
            id: target.get("id"),
            email: target.get("email"),
            isActive: target.get("is_active"),
            deletedAt: target.get("deleted_at"),
          },
        },
      })
    );
  } catch (err: any) {
    console.error("DELETE_USER_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to delete user",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}