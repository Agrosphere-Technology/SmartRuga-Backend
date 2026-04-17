"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRanch = createRanch;
exports.listAllRanches = listAllRanches;
exports.getRanchBySlug = getRanchBySlug;
const slugify_1 = __importDefault(require("slugify"));
const models_1 = require("../models");
const ranch_validator_1 = require("../validators/ranch.validator");
const http_status_codes_1 = require("http-status-codes");
const apiResponse_1 = require("../utils/apiResponse");
async function createRanch(req, res) {
    try {
        const parsed = ranch_validator_1.createRanchSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json((0, apiResponse_1.errorResponse)({
                message: "Invalid payload",
                errors: parsed.error.issues,
            }));
        }
        const userId = req.user.id;
        const { name, locationName, address, latitude, longitude } = parsed.data;
        const baseSlug = (0, slugify_1.default)(name, { lower: true, strict: true, trim: true });
        let slug = baseSlug;
        let counter = 1;
        while (await models_1.Ranch.findOne({ where: { slug } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        const ranch = await models_1.Ranch.create({
            name,
            slug,
            created_by: userId,
            location_name: locationName ?? null,
            address: address ?? null,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
        });
        const membership = await models_1.RanchMember.create({
            ranch_id: ranch.get("id"),
            user_id: userId,
            role: "owner",
            status: "active",
        });
        return res.status(http_status_codes_1.StatusCodes.CREATED).json((0, apiResponse_1.successResponse)({
            message: "Ranch created successfully",
            data: {
                ranch: {
                    id: ranch.get("id"),
                    name: ranch.get("name"),
                    slug: ranch.get("slug"),
                    locationName: ranch.get("location_name") ?? null,
                    address: ranch.get("address") ?? null,
                    latitude: ranch.get("latitude") ?? null,
                    longitude: ranch.get("longitude") ?? null,
                },
                membership: {
                    id: membership.get("id"),
                    role: membership.get("role"),
                    status: membership.get("status"),
                },
            },
        }));
    }
    catch (err) {
        console.error("CREATE_RANCH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to create ranch",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function listAllRanches(req, res) {
    try {
        const userId = req.user.id;
        const memberships = await models_1.RanchMember.findAll({
            where: { user_id: userId },
            include: [{ model: models_1.Ranch, as: "ranch" }],
            order: [["created_at", "DESC"]],
        });
        const ranches = memberships.map((m) => {
            const ranch = m.ranch;
            return {
                id: ranch.id,
                name: ranch.name,
                slug: ranch.slug,
                role: m.role,
                status: m.status,
            };
        });
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Ranches fetched successfully",
            data: {
                ranches,
            },
        }));
    }
    catch (err) {
        console.error("LIST_RANCHES_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to list ranches",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
async function getRanchBySlug(req, res) {
    try {
        const userId = req.user.id;
        const { slug } = req.params;
        const ranch = await models_1.Ranch.findOne({ where: { slug } });
        if (!ranch) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json((0, apiResponse_1.errorResponse)({
                message: "Ranch not found",
            }));
        }
        const membership = await models_1.RanchMember.findOne({
            where: { ranch_id: ranch.get("id"), user_id: userId },
        });
        if (!membership) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Access denied",
            }));
        }
        if (membership.get("status") !== "active") {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json((0, apiResponse_1.errorResponse)({
                message: "Membership not active",
            }));
        }
        return res.status(http_status_codes_1.StatusCodes.OK).json((0, apiResponse_1.successResponse)({
            message: "Ranch fetched successfully",
            data: {
                ranch: {
                    id: ranch.get("id"),
                    name: ranch.get("name"),
                    slug: ranch.get("slug"),
                    locationName: ranch.get("location_name") ?? null,
                    address: ranch.get("address") ?? null,
                    latitude: ranch.get("latitude") ?? null,
                    longitude: ranch.get("longitude") ?? null,
                },
                membership: {
                    id: membership.get("id"),
                    role: membership.get("role"),
                    status: membership.get("status"),
                },
            },
        }));
    }
    catch (err) {
        console.error("GET_RANCH_ERROR:", err);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json((0, apiResponse_1.errorResponse)({
            message: "Failed to fetch ranch",
            errors: err?.message ?? "Unknown error",
        }));
    }
}
