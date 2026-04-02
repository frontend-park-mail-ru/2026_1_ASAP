export interface BackendProfile {
    user_id: number;
    login: string;
    first_name: string;
    email?: string;
    birth_date?: string;
    last_name?: string;
    avatar?: string;
    bio?: string;
    last_seen?: string;
};

export interface FrontendProfile {
    mainInfo: ProfileMainInfo;
    additionalInfo: ProfileAdditionalInfo;
};

export interface ProfileMainInfo {
    firstName: string;
    lastName?: string;
    avatarUrl?: string;
    lastSeen?: Date;
};

export interface ProfileAdditionalInfo {
    login: string;
    email?: string;
    birthDate?: Date;
    bio?: string;
};