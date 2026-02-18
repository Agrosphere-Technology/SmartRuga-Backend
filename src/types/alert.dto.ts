// Alert types



export type CountRow = { total: number };

export type AlertRow = {
    id: string;
    ranch_id: string;
    animal_id: string | null;
    alert_type: string;
    message: string;
    is_read: boolean;
    created_at: Date;

    animal_public_id: string | null;
    animal_tag_number: string | null;
};