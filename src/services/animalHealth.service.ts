import { QueryTypes } from "sequelize";
import { sequelize } from "../models";

export type HealthStatus =
    | "healthy"
    | "sick"
    | "recovering"
    | "quarantined";

type LatestHealthRow = {
    animal_id: string;
    status: HealthStatus;
};

export async function getLatestHealthForAnimals(
    animalIds: string[]
): Promise<Record<string, HealthStatus>> {
    if (!animalIds.length) return {};

    const rows = await sequelize.query<LatestHealthRow>(
        `
    SELECT DISTINCT ON (animal_id)
      animal_id,
      status
    FROM animal_health_events
    WHERE animal_id = ANY($1::uuid[])
    ORDER BY animal_id, created_at DESC
    `,
        {
            bind: [animalIds], // ✅ ARRAY binding
            type: QueryTypes.SELECT,
        }
    );

    const map: Record<string, HealthStatus> = {};
    for (const row of rows) {
        map[row.animal_id] = row.status;
    }

    return map;
}
