import { Request, Response } from "express";
import { QueryTypes } from "sequelize";
import { Animal, Species, sequelize } from "../models";
import { buildAnimalQrUrl } from "../utils/qr";
import { StatusCodes } from "http-status-codes";

type LatestHealthRow = { status: string };

export async function qrScanAnimal(req: Request, res: Response) {
  try {
    const { publicId } = req.params;

    const animal = await Animal.findOne({
      where: { public_id: publicId },
      include: [
        { model: Species, as: "species", attributes: ["id", "name", "code"] },
      ],
    });

    if (!animal) {
      return res.status(StatusCodes.NOT_FOUND).send("Animal not found");
    }

    // ✅ latest health status (single animal)
    const rows = await sequelize.query<LatestHealthRow>(
      `
      SELECT status
      FROM animal_health_events
      WHERE animal_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      {
        bind: [animal.get("id") as string],
        type: QueryTypes.SELECT,
      }
    );

    const healthStatus = rows[0]?.status ?? "healthy";

    const accept = req.headers.accept || "";
    if (accept.includes("text/html")) {
      return res.send(`
        <html>
          <head><title>SmartRUGA Animal</title></head>
          <body style="font-family: Arial; padding: 24px;">
            <h2>SmartRUGA Animal Profile</h2>
            <p><b>Tag:</b> ${animal.get("tag_number") ?? "-"}</p>
            <p><b>Species:</b> ${(animal as any).species?.name ?? "-"}</p>
            <p><b>Status:</b> ${animal.get("status")}</p>
            <p><b>Health:</b> ${healthStatus}</p>
            <p><b>QR URL:</b> ${buildAnimalQrUrl(animal.get("public_id") as string)}</p>
            <hr/>
            <p><a href="/api/v1/docs">Open API Docs</a></p>
          </body>
        </html>
      `);
    }

    return res.json({
      publicId: animal.get("public_id"),
      tagNumber: animal.get("tag_number"),
      sex: animal.get("sex"),
      status: animal.get("status"),
      healthStatus,
      species: {
        id: (animal as any).species?.id,
        name: (animal as any).species?.name,
        code: (animal as any).species?.code,
      },
    });
  } catch (err: any) {
    console.error("QR_SCAN_ERROR:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Failed to load animal");
  }
}
