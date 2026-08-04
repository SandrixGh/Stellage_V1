export interface BoxTemplate {
    id: string;
    title: string;
    description: string;
    price: string;
    currency: string;
    rarity: string;
    contentType?: string | null;
    owner_username?: string | null;
    owner_nickname?: string | null;
    owner_avatar_url?: string | null;
    creator_id?: string | null;
    likes_count?: number;
    is_liked?: boolean | null;
    comments_count?: number;
    created_at: string;
    updated_at: string;
}

export interface BoxContent {
    text?: string | null;
}

export type AssetKind = "photo" | "video";

export type BoxContentType = "empty" | "text" | "photo" | "video" | "mixed";

export interface BoxAsset {
    id: string;
    kind: AssetKind;
    mime: string;
    size_bytes: number;
    original_name: string;
    created_at: string;
}

export interface Box {
    id: string;
    user_id: string;
    shelf_id: string | null;
    template_id: string;
    serial_number: number;
    shelf_row: number | null;
    shelf_col: number | null;
    is_sealed: 'sealed' | 'not sealed';
    is_public: 'public' | 'private';
    is_verified: 'verified' | 'not verified';
    content: BoxContent | null;
    assets: BoxAsset[];
    content_type: BoxContentType;
    likes_count: number;
    is_liked?: boolean | null;
    comments_count?: number;
    template: BoxTemplate;
    created_at: string;
    updated_at: string;
}

export interface CommentUser {
    id: string;
    username: string | null;
    nickname: string | null;
    avatar_url: string | null;
}

export interface CommentItem {
    id: string;
    user_id: string;
    template_id: string | null;
    instance_id: string | null;
    text: string;
    author: CommentUser;
    created_at: string;
}