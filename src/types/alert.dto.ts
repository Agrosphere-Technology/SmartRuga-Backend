// Alert types



export type CountRow = { total: number };

export type AlertRow = {
    id: string;
    ranch_id: string;
    animal_id: string | null;
    alert_type: string;
    message: string;
    is_read: boolean;
    read_at: Date | null;
    read_by: string | null;
    created_at: Date;

    animal_public_id: string | null;
    animal_tag_number: string | null;

    read_by_email: string | null;
    read_by_first_name: string | null;
    read_by_last_name: string | null;
};