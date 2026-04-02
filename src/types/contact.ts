export interface BackendContact {
    user_id: number;
    contact_user_id: number;
    contact_name: string;
    avatar?: string;
    created_at: string;
};

export interface FrontendContact {
    contact_user_id: number;
    contact_name: string;
    avatarURL: string;
};
