export type AnimalStatsRow = {
    total: string;
    active: string;
    sold: string;
    deceased: string;
    sick: string;
};

export type RecentActivityRow = {
    type:
    | "health"
    | "animal_update"
    | "movement"
    | "vaccination"
    | "task_created"
    | "task_submission"
    | "task_review";
    id: string;
    created_at: Date;
    animal_public_id: string | null;
    animal_tag_number: string | null;
    status: string | null;
    field: string | null;
    from_value: string | null;
    to_value: string | null;
    movement_type: string | null;
    vaccine_name: string | null;
    task_public_id: string | null;
    task_title: string | null;
    review_status: string | null;
};

export type DashboardActivityItem = {
    type:
    | "health"
    | "animal_update"
    | "movement"
    | "vaccination"
    | "task_created"
    | "task_submission"
    | "task_review";
    id: string;
    createdAt: Date;
    animalPublicId: string | null;
    animalTagNumber: string | null;
    taskPublicId?: string | null;
    taskTitle?: string | null;
    title: string;
    description: string;
    changes?: Array<{
        field: string | null;
        from: string | null;
        to: string | null;
    }>;
};

export function buildDashboardActivity(items: RecentActivityRow[]): DashboardActivityItem[] {
    const grouped: DashboardActivityItem[] = [];
    const groupedUpdates = new Map<
        string,
        {
            createdAt: Date;
            animalPublicId: string;
            animalTagNumber: string | null;
            changes: Array<{ field: string | null; from: string | null; to: string | null }>;
        }
    >();

    for (const item of items) {
        if (item.type === "animal_update") {
            const key = `${item.animal_public_id}::${new Date(item.created_at).toISOString()}`;

            if (!groupedUpdates.has(key)) {
                groupedUpdates.set(key, {
                    createdAt: item.created_at,
                    animalPublicId: item.animal_public_id!,
                    animalTagNumber: item.animal_tag_number,
                    changes: [],
                });
            }

            groupedUpdates.get(key)!.changes.push({
                field: item.field ?? null,
                from: item.from_value ?? null,
                to: item.to_value ?? null,
            });

            continue;
        }

        let title = "Activity recorded";
        let description = "A ranch activity was recorded";

        if (item.type === "health") {
            title = "Health status updated";
            description = `Animal ${item.animal_tag_number ?? item.animal_public_id} marked as ${item.status}`;
        } else if (item.type === "movement") {
            title = "Animal moved";
            description = `Animal ${item.animal_tag_number ?? item.animal_public_id} movement type: ${item.movement_type}`;
        } else if (item.type === "vaccination") {
            title = "Vaccination recorded";
            description = `${item.vaccine_name} recorded for animal ${item.animal_tag_number ?? item.animal_public_id}`;
        } else if (item.type === "task_created") {
            title = "Task created";
            description = `Task "${item.task_title}" was created`;
        } else if (item.type === "task_submission") {
            title = "Task proof submitted";
            description = `Proof was submitted for task "${item.task_title}"`;
        } else if (item.type === "task_review") {
            title = "Task submission reviewed";
            description = `Submission for task "${item.task_title}" was ${item.review_status}`;
        }

        grouped.push({
            type: item.type,
            id: item.id,
            createdAt: item.created_at,
            animalPublicId: item.animal_public_id,
            animalTagNumber: item.animal_tag_number,
            taskPublicId: item.task_public_id,
            taskTitle: item.task_title,
            title,
            description,
        });
    }

    for (const [key, value] of groupedUpdates.entries()) {
        grouped.push({
            type: "animal_update",
            id: key,
            createdAt: value.createdAt,
            animalPublicId: value.animalPublicId,
            animalTagNumber: value.animalTagNumber,
            title: "Animal record updated",
            description: `${value.changes.length} field${value.changes.length > 1 ? "s" : ""} updated`,
            changes: value.changes,
        });
    }

    grouped.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return grouped.slice(0, 10);
}

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


export type TaskStatsRow = {
    total: string;
    pending: string;
    in_progress: string;
    completed: string;
    cancelled: string;
};

export type SubmissionApprovalStatsRow = {
    pending: string;
    approved: string;
    rejected: string;
};
