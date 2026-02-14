import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Species } from "../models";

export async function listSpecies(_req: Request, res: Response) {
    try {
        const rows = await Species.findAll({
            attributes: ["id", "name", "code"],
            order: [["name", "ASC"]],
        } as any);

        return res.status(StatusCodes.OK).json({
            species: rows.map((s: any) => ({
                id: s.get("id"),
                name: s.get("name"),
                code: s.get("code"),
            })),
        });
    } catch (err: any) {
        console.error("LIST_SPECIES_ERROR:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to list species",
            error: err?.message ?? "Unknown error",
        });
    }
}
