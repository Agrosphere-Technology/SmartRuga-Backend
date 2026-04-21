import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { PlatformTicket, Ranch, User } from "../models";
import {
    createPlatformTicketSchema,
    listPlatformTicketsQuerySchema,
    updatePlatformTicketSchema,
} from "../validators/platform-ticket.validator";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { PLATFORM_ROLES } from "../constants/roles";

function getSingleParam(param: string | string[] | undefined) {
    if (!param) return undefined;
    return Array.isArray(param) ? param[0] : param;
}

function formatPlatformTicket(ticket: any) {
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

export async function createPlatformTicket(req: Request, res: Response) {
    try {
        const parsed = createPlatformTicketSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid platform ticket payload",
                    errors: parsed.error.issues,
                })
            );
        }

        const requester = req.user!;
        const ranch = req.ranch;
        const ranchRole = req.membership?.ranchRole ?? null;
        const isSuperAdmin =
            requester.platformRole === PLATFORM_ROLES.SUPER_ADMIN;

        const canCreate =
            isSuperAdmin || ["owner", "manager"].includes(ranchRole ?? "");

        if (!canCreate) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only owner, manager, or super_admin can create platform tickets",
                })
            );
        }

        const ticket = await PlatformTicket.create({
            ranch_id: ranch?.id ?? null,
            raised_by_user_id: requester.id,
            title: parsed.data.title,
            description: parsed.data.description,
            category: parsed.data.category,
            priority: parsed.data.priority ?? "medium",
            status: "open",
        });

        const ticketId = ticket.get("id") as string;

        const createdTicket = await PlatformTicket.findByPk(ticketId, {
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

        if (!createdTicket) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
                errorResponse({
                    message: "Ticket was created but could not be reloaded",
                })
            );
        }

        return res.status(StatusCodes.CREATED).json(
            successResponse({
                message: "Platform ticket created successfully",
                data: {
                    ticket: formatPlatformTicket(createdTicket),
                },
            })
        );
    } catch (err: any) {
        console.error("CREATE_PLATFORM_TICKET_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to create platform ticket",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function listMyPlatformTickets(req: Request, res: Response) {
    try {
        const parsed = listPlatformTicketsQuerySchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid platform ticket filters",
                    errors: parsed.error.issues,
                })
            );
        }

        const requester = req.user!;
        const ranch = req.ranch;
        const ranchRole = req.membership?.ranchRole ?? null;
        const isSuperAdmin =
            requester.platformRole === PLATFORM_ROLES.SUPER_ADMIN;

        const whereClause: any = {};

        if (parsed.data.status) whereClause.status = parsed.data.status;
        if (parsed.data.category) whereClause.category = parsed.data.category;
        if (parsed.data.priority) whereClause.priority = parsed.data.priority;

        if (isSuperAdmin) {
            // super admin sees all tickets
        } else if (["owner", "manager"].includes(ranchRole ?? "")) {
            whereClause.ranch_id = ranch?.id ?? null;
        } else {
            whereClause.raised_by_user_id = requester.id;
        }

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
                    tickets: tickets.map((ticket: any) => formatPlatformTicket(ticket)),
                },
            })
        );
    } catch (err: any) {
        console.error("LIST_PLATFORM_TICKETS_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch platform tickets",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function getPlatformTicketByPublicId(
    req: Request,
    res: Response
) {
    try {
        const publicId = getSingleParam(req.params.publicId);

        if (!publicId) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Ticket publicId is required",
                })
            );
        }

        const requester = req.user!;
        const ranch = req.ranch;
        const ranchRole = req.membership?.ranchRole ?? null;
        const isSuperAdmin =
            requester.platformRole === PLATFORM_ROLES.SUPER_ADMIN;

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

        if (isSuperAdmin) {
            return res.status(StatusCodes.OK).json(
                successResponse({
                    message: "Platform ticket fetched successfully",
                    data: { ticket: formatPlatformTicket(ticket) },
                })
            );
        }

        const ticketRanchId = ticket.get("ranch_id");
        const raisedByUserId = ticket.get("raised_by_user_id");

        const canView =
            raisedByUserId === requester.id ||
            (["owner", "manager"].includes(ranchRole ?? "") &&
                ranch?.id &&
                ticketRanchId === ranch.id);

        if (!canView) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Access denied",
                })
            );
        }

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Platform ticket fetched successfully",
                data: { ticket: formatPlatformTicket(ticket) },
            })
        );
    } catch (err: any) {
        console.error("GET_PLATFORM_TICKET_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to fetch platform ticket",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}

export async function updatePlatformTicket(req: Request, res: Response) {
    try {
        const requester = req.user!;

        if (requester.platformRole !== PLATFORM_ROLES.SUPER_ADMIN) {
            return res.status(StatusCodes.FORBIDDEN).json(
                errorResponse({
                    message: "Only super_admin can update platform tickets",
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

        const parsed = updatePlatformTicketSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                errorResponse({
                    message: "Invalid platform ticket update payload",
                    errors: parsed.error.issues,
                })
            );
        }

        const ticket = await PlatformTicket.findOne({
            where: { public_id: publicId },
        });

        if (!ticket) {
            return res.status(StatusCodes.NOT_FOUND).json(
                errorResponse({
                    message: "Platform ticket not found",
                })
            );
        }

        const updatePayload: any = {};

        if (parsed.data.status) {
            updatePayload.status = parsed.data.status;

            if (parsed.data.status === "resolved") {
                updatePayload.resolved_at = new Date();
            }

            if (parsed.data.status === "closed") {
                updatePayload.closed_at = new Date();
            }
        }

        if (parsed.data.priority) {
            updatePayload.priority = parsed.data.priority;
        }

        if (parsed.data.assignedToUserId !== undefined) {
            updatePayload.assigned_to_user_id = parsed.data.assignedToUserId;
        }

        await ticket.update(updatePayload);

        const updatedTicket = await PlatformTicket.findOne({
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

        if (!updatedTicket) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
                errorResponse({
                    message: "Ticket was updated but could not be reloaded",
                })
            );
        }

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Platform ticket updated successfully",
                data: {
                    ticket: formatPlatformTicket(updatedTicket),
                },
            })
        );
    } catch (err: any) {
        console.error("UPDATE_PLATFORM_TICKET_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to update platform ticket",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}