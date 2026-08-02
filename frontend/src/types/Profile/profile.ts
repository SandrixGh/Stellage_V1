import type { Shelf } from "../Stellage/shelves";

/** Публичная карточка пользователя (без email/PII) — для поиска и списков. */
export interface PublicUser {
    id: string;
    username: string | null;
    nickname: string | null;
    last_seen_at: string | null;
    is_developer?: boolean;
    // Presigned-ссылка на аватар (может истечь); null — аватара нет.
    avatar_url?: string | null;
    banner_url?: string | null;
    banner_pos_y?: number;
}

/** Счётчики для витрины профиля (совпадают с backend ProfileStats). */
export interface ProfileStats {
    boxes: number;
    public_boxes: number;
    shelves: number;
}

/**
 * Публичный профиль: карточка + витрина. avatar_url / banner_url —
 * короткоживущие presigned-ссылки (могут истечь, тянутся заново).
 */
export interface PublicProfile extends PublicUser {
    bio?: string | null;
    avatar_url?: string | null;
    banner_url?: string | null;
    stats: ProfileStats;
    shelf: Shelf | null;
}
