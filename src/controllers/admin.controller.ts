import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryTypes } from "sequelize";
import { User, RanchMember, Ranch, PlatformTicket, sequelize } from "../models";
import { PLATFORM_ROLES } from "../constants/roles";
import { updateRoleSchema } from "../validators/auth.validator";
import { listPlatformTicketsQuerySchema } from "../validators/platform-ticket.validator";
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

function formatPlatformTicketForAdmin(ticket: any) {
  return {
    id: ticket.get("id"),
    publicId: ticket.get("public_id"),
    title: ticket.get("title"),
    description: ticket.get("description"),
    category: ticket.get("category"),
    priority: ticket.get("priority"),
    status: ticket.get("status"),
    resolvedAt: ticket.get("resolved_at"),
    closedAt: ticket.get("closed_at"),
    createdAt: ticket.get("created_at"),
    updatedAt: ticket.get("updated_at"),
    ranch: ticket.ranch
      ? {
        id: ticket.ranch.get("id"),
        name: ticket.ranch.get("name"),
        slug: ticket.ranch.get("slug"),
      }
      : null,
    raisedByUser: ticket.raisedByUser
      ? {
        id: ticket.raisedByUser.get("id"),
        firstName: ticket.raisedByUser.get("first_name"),
        lastName: ticket.raisedByUser.get("last_name"),
        email: ticket.raisedByUser.get("email"),
      }
      : null,
    assignedToUser: ticket.assignedToUser
      ? {
        id: ticket.assignedToUser.get("id"),
        firstName: ticket.assignedToUser.get("first_name"),
        lastName: ticket.assignedToUser.get("last_name"),
        email: ticket.assignedToUser.get("email"),
      }
      : null,
  };
}

export async function getPlatformDashboard(req: Request, res: Response) {
  try {
    const requester = req.user!;
    const requesterRole = requester.platformRole;

    if (requesterRole !== PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only super_admin can view platform dashboard",
        })
      );
    }

    const statsPromise = sequelize.query(
      `
      SELECT
        (SELECT COUNT(*)::text FROM users) AS total_users,
        (SELECT COUNT(*)::text FROM users WHERE is_active = true) AS active_users,
        (SELECT COUNT(*)::text FROM users WHERE deleted_at IS NOT NULL) AS deleted_users,
        (SELECT COUNT(*)::text FROM ranches) AS total_ranches,
        (SELECT COUNT(*)::text FROM ranch_members) AS total_memberships,
        (SELECT COUNT(*)::text FROM ranch_members WHERE status = 'active') AS active_memberships,
        (SELECT COUNT(*)::text FROM animals) AS total_animals,
        (SELECT COUNT(*)::text FROM concerns WHERE status IN ('open', 'in_review')) AS open_concerns,
        (
          SELECT COUNT(*)::text
          FROM inventory_items
          WHERE is_active = true
            AND quantity_on_hand <= reorder_level
        ) AS low_stock_items,
        (
          SELECT COUNT(*)::text
          FROM animal_vaccinations
          WHERE deleted_at IS NULL
            AND next_due_at IS NOT NULL
            AND next_due_at < NOW()
        ) AS overdue_vaccinations
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const recentUsersPromise = User.findAll({
      order: [["created_at", "DESC"]],
      limit: 5,
    });

    const recentRanchesPromise = Ranch.findAll({
      order: [["created_at", "DESC"]],
      limit: 5,
    });

    const ranchHealthPromise = sequelize.query(
      `
      SELECT
        r.id,
        r.name,
        r.slug,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('open', 'in_review'))::text AS open_concerns,
        COUNT(DISTINCT i.id) FILTER (
          WHERE i.is_active = true AND i.quantity_on_hand <= i.reorder_level
        )::text AS low_stock_items,
        COUNT(DISTINCT a.id)::text AS total_animals
      FROM ranches r
      LEFT JOIN concerns c ON c.ranch_id = r.id
      LEFT JOIN inventory_items i ON i.ranch_id = r.id
      LEFT JOIN animals a ON a.ranch_id = r.id
      GROUP BY r.id, r.name, r.slug
      ORDER BY r.created_at DESC
      LIMIT 10
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const [statsRows, recentUsers, recentRanches, ranchHealthRows] =
      await Promise.all([
        statsPromise,
        recentUsersPromise,
        recentRanchesPromise,
        ranchHealthPromise,
      ]);

    const stats = (statsRows as any[])[0] ?? {};

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Platform dashboard fetched successfully",
        data: {
          overview: {
            totalUsers: Number(stats.total_users ?? 0),
            activeUsers: Number(stats.active_users ?? 0),
            deletedUsers: Number(stats.deleted_users ?? 0),
            totalRanches: Number(stats.total_ranches ?? 0),
            totalMemberships: Number(stats.total_memberships ?? 0),
            activeMemberships: Number(stats.active_memberships ?? 0),
            totalAnimals: Number(stats.total_animals ?? 0),
            openConcerns: Number(stats.open_concerns ?? 0),
            lowStockItems: Number(stats.low_stock_items ?? 0),
            overdueVaccinations: Number(stats.overdue_vaccinations ?? 0),
          },
          recentUsers: recentUsers.map((user: any) => ({
            id: user.get("id"),
            firstName: user.get("first_name"),
            lastName: user.get("last_name"),
            email: user.get("email"),
            platformRole: user.get("platform_role"),
            isActive: user.get("is_active"),
            createdAt: user.get("created_at"),
          })),
          recentRanches: recentRanches.map((ranch: any) => ({
            id: ranch.get("id"),
            name: ranch.get("name"),
            slug: ranch.get("slug"),
            createdAt: ranch.get("created_at"),
          })),
          ranchHealth: (ranchHealthRows as any[]).map((row) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            totalAnimals: Number(row.total_animals ?? 0),
            openConcerns: Number(row.open_concerns ?? 0),
            lowStockItems: Number(row.low_stock_items ?? 0),
          })),
          quickLinks: {
            users: "/api/v1/admin/users",
            platformTickets: "/api/v1/admin/platform-tickets",
          },
        },
      })
    );
  } catch (err: any) {
    console.error("GET_PLATFORM_DASHBOARD_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to fetch platform dashboard",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
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

export async function listAllPlatformTickets(req: Request, res: Response) {
  try {
    const requester = req.user!;
    const requesterRole = requester.platformRole;

    if (requesterRole !== PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only super_admin can view all platform tickets",
        })
      );
    }

    const parsed = listPlatformTicketsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid platform ticket filters",
          errors: parsed.error.issues,
        })
      );
    }

    const whereClause: any = {};

    if (parsed.data.status) whereClause.status = parsed.data.status;
    if (parsed.data.category) whereClause.category = parsed.data.category;
    if (parsed.data.priority) whereClause.priority = parsed.data.priority;

    const tickets = await PlatformTicket.findAll({
      where: whereClause,
      include: [
        {
          model: Ranch,
          as: "ranch",
          attributes: ["id", "name", "slug"],
        },
        {
          model: User,
          as: "raisedByUser",
          attributes: ["id", "first_name", "last_name", "email"],
        },
        {
          model: User,
          as: "assignedToUser",
          attributes: ["id", "first_name", "last_name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    } as any);

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Platform tickets fetched successfully",
        data: {
          tickets: (tickets as any[]).map((ticket) =>
            formatPlatformTicketForAdmin(ticket)
          ),
        },
      })
    );
  } catch (err: any) {
    console.error("LIST_ALL_PLATFORM_TICKETS_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to fetch platform tickets",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

export async function getPlatformTicketByPublicIdForAdmin(
  req: Request,
  res: Response
) {
  try {
    const requester = req.user!;
    const requesterRole = requester.platformRole;

    if (requesterRole !== PLATFORM_ROLES.SUPER_ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json(
        errorResponse({
          message: "Only super_admin can view platform ticket details",
        })
      );
    }

    const publicId = getSingleParam(req.params.publicId);

    if (!publicId) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Ticket publicId is required",
        })
      );
    }

    const ticket = await PlatformTicket.findOne({
      where: { public_id: publicId },
      include: [
        {
          model: Ranch,
          as: "ranch",
          attributes: ["id", "name", "slug"],
        },
        {
          model: User,
          as: "raisedByUser",
          attributes: ["id", "first_name", "last_name", "email"],
        },
        {
          model: User,
          as: "assignedToUser",
          attributes: ["id", "first_name", "last_name", "email"],
        },
      ],
    } as any);

    if (!ticket) {
      return res.status(StatusCodes.NOT_FOUND).json(
        errorResponse({
          message: "Platform ticket not found",
        })
      );
    }

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Platform ticket fetched successfully",
        data: {
          ticket: formatPlatformTicketForAdmin(ticket as any),
        },
      })
    );
  } catch (err: any) {
    console.error("GET_PLATFORM_TICKET_FOR_ADMIN_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Failed to fetch platform ticket",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}