interface UserWithId {
    id: string;
}

interface UserWithEmail {
    email: string;
}

export interface UserVerifySchema extends UserWithId, UserWithEmail{
    session_id?: string | null;
}

export interface UserReturnData extends UserWithId, UserWithEmail{
    is_active: boolean;
    is_verified: boolean;
    is_superuser: boolean;
    created_at: string;
    updated_at: string;
}

export interface ApiError {
    detail: string;
}