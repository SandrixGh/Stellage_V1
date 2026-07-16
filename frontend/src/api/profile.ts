import axios from "axios";
import { api } from "./instance";
import type { PublicProfile } from "../types/Profile/profile";

// Дублирует backend AVATAR_MIME_TYPES/MAX_BYTES только для мгновенной подсветки
// ошибок в UI. Настоящая проверка — на сервере и в S3-политике.
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const AVATAR_MAX_BYTES = 5 * 2 ** 20; // 5 MB

interface AvatarUploadTarget {
    key: string;
    url: string;
    fields: Record<string, string>;
    expires_in: number;
    mime: string;
    size_bytes: number;
}

/** Свой профиль-витрина (аватар/bio/статистика + главный стеллаж). */
export async function getMyProfile(): Promise<PublicProfile> {
    const res = await api.get<PublicProfile>("/profile/me");
    return res.data;
}

/** Чужой публичный профиль по username. */
export async function getPublicProfile(username: string): Promise<PublicProfile> {
    const res = await api.get<PublicProfile>(`/profile/public/${username}`);
    return res.data;
}

/**
 * Загрузка аватара: initiate (presigned POST) → прямой POST в S3 → complete
 * (серверная проверка размера/типа/сигнатуры и запись avatar_key). Байты через
 * наш бэкенд не проходят — как и для ассетов коробки.
 */
export async function uploadAvatar(file: File): Promise<void> {
    if (!AVATAR_MIME_TYPES.includes(file.type)) {
        throw new Error("Поддерживаются только изображения (JPEG, PNG, WebP, GIF)");
    }
    if (file.size > AVATAR_MAX_BYTES) {
        throw new Error("Изображение больше 5 МБ");
    }

    const { data: target } = await api.post<AvatarUploadTarget>(
        "/profile/avatar/initiate",
        { mime: file.type, size_bytes: file.size },
    );

    const form = new FormData();
    Object.entries(target.fields).forEach(([k, v]) => form.append(k, v));
    form.append("file", file); // файл обязан идти последним полем

    // Голый axios, НЕ общий api-инстанс: cookie авторизации не уходит в S3.
    await axios.post(target.url, form, { withCredentials: false });

    await api.post("/profile/avatar/complete", {
        key: target.key,
        mime: target.mime,
        size_bytes: target.size_bytes,
    });
}

/** Человекочитаемое сообщение из ошибки загрузки аватара. */
export function avatarErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message && !("response" in err)) return err.message;
    const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
    return typeof detail === "string" ? detail : "Не удалось загрузить аватар";
}
