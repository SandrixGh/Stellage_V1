import type { Shelf } from "../Stellage/shelves";

/** Публичная карточка пользователя (без email/PII) — для поиска. */
export interface PublicUser {
    id: string;
    username: string | null;
    nickname: string | null;
    last_seen_at: string | null;
}

/** Публичный профиль: карточка пользователя + его главный публичный стеллаж. */
export interface PublicProfile extends PublicUser {
    shelf: Shelf | null;
}
