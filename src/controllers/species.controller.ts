import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Species } from "../models";
import { errorResponse, successResponse } from "../utils/apiResponse";

export async function listSpecies(_req: Request, res: Response) {
    try {
        const rows = await Species.findAll({
            attributes: ["id", "name", "code"],
            order: [["name", "ASC"]],
        } as any);

        return res.status(StatusCodes.OK).json(
            successResponse({
                message: "Species fetched successfully",
                data: {
                    species: rows.map((s: any) => ({
                        id: s.get("id"),
                        name: s.get("name"),
                        code: s.get("code"),
                    })),
                },
            })
        );
    } catch (err: any) {
        console.error("LIST_SPECIES_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            errorResponse({
                message: "Failed to list species",
                errors: err?.message ?? "Unknown error",
            })
        );
    }
}