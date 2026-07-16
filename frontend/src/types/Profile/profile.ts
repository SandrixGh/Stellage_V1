import type { Shelf } from "../Stellage/shelves";

/** Публичная карточка пользователя (без email/PII) — для поиска и списков. */
export interface PublicUser {
    id: string;
    username: string | null;
    nickname: string | null;
    last_seen_at: string | null;
    // Presigned-ссылка на аватар (может истечь); null — аватара нет.
    avatar_url?: string | null;
}

/** Счётчики для витрины профиля (совпадают с backend ProfileStats). */
export interface ProfileStats {
    boxes: number;
    public_boxes: number;
    shelves: number;
}

/**
 * Публичный профиль: карточка + витрина. avatar_url — короткоживущая
 * presigned-ссылка (может истечь, тянется заново при загрузке страницы);
 * null — аватар не загружен, показываем монограмму.
 */
export interface PublicProfile extends PublicUser {
    bio?: string | null;
    avatar_url?: string | null;
    stats: ProfileStats;
    shelf: Shelf | null;
}
