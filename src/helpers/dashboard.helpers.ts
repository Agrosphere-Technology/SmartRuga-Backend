export type AnimalStatsRow = {
    total: string;
    active: string;
    sold: string;
    deceased: string;
    sick: string;
};

export type RecentActivityRow = {
    type: "health" | "animal_update" | "movement" | "vaccination";
    id: string;
    created_at: Date;
    animal_public_id: string;
    animal_tag_number: string | null;
    status: string | null;
    field: string | null;
    from_value: string | null;
    to_value: string | null;
    movement_type: string | null;
    vaccine_name: string | null;
};

export type DashboardActivityItem = {
    type: "health" | "animal_update" | "movement" | "vaccination";
    id: string;
    createdAt: Date;
    animalPublicId: string;
    animalTagNumber: string | null;
    title: string;
    description: string;
    changes?: Array<{
        field: string | null;
        from: string | null;
        to: string | null;
    }>;
};


export function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
