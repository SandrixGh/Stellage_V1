export interface UserVerifySchema {
    id: string;
    email: string;
    session_id?: string | null;
    username?: string | null;
    nickname?: string | null;
    last_seen_at?: string | null;
}

export interface UserReturnData extends UserVerifySchema {
    is_active: boolean;
    is_verified: boolean;
    is_superuser: boolean;
    created_at: string;
    updated_at: string;
}

export interface ApiError {
    detail: string;
}