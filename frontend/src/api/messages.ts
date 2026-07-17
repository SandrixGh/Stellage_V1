import axios from "axios";
import { api } from "./instance";
import type { PublicUser } from "../types/Profile/profile";
import type { AssetKind } from "../types/Stellage/boxes";
import { kindForMime } from "./assets";

export type MessageKind = "text" | "gift";

export interface MessageItem {
    id: string;
    kind: MessageKind;
    text: string | null;
    is_read: boolean;
    is_mine: boolean;
    created_at: string;
    edited: boolean;
    // Вложение (короткоживущая presigned-ссылка, может истечь).
    asset_url: string | null;
    asset_kind: AssetKind | null;
    asset_mime: string | null;
    asset_name: string | null;
    // Подарок (kind === "gift").
    gift_instance_id: string | null;
    gift_box_title: string | null;
}

export interface ConversationPreview {
    user: PublicUser;
    last_text: string;
    last_at: string;
    unread: number;
}

interface AttachmentTarget {
    message_id: string;
    url: string;
    fields: Record<string, string>;
    expires_in: number;
}

/** Отправить текстовое сообщение пользователю по username. */
export async function sendMessage(toUsername: string, text: string): Promise<MessageItem> {
    const res = await api.post<MessageItem>("/messages/send", {
        to_username: toUsername,
        text,
    });
    return res.data;
}

/**
 * Отправить вложение (фото/видео): initiate → прямой POST файла в S3 →
 * complete. Байты через наш бэкенд не проходят. caption — необязательная
 * подпись. Возвращает готовое сообщение.
 */
export async function sendAttachment(
    toUsername: string,
    file: File,
    caption?: string,
    onProgress?: (fraction: number) => void,
): Promise<MessageItem> {
    const kind = kindForMime(file.type);
    if (!kind) throw new Error("Неподдерживаемый тип файла");

    const { data: target } = await api.post<AttachmentTarget>(
        "/messages/attachment/initiate",
        {
            to_username: toUsername,
            kind,
            mime: file.type,
            size_bytes: file.size,
            original_name: file.name,
        },
    );

    const form = new FormData();
    Object.entries(target.fields).forEach(([k, v]) => form.append(k, v));
    form.append("file", file); // файл — последним полем формы

    await axios.post(target.url, form, {
        withCredentials: false,
        onUploadProgress: (e) => {
            const total = e.total ?? file.size;
            if (total > 0) onProgress?.(Math.min(e.loaded / total, 1));
        },
    });

    const { data: msg } = await api.post<MessageItem>(
        "/messages/attachment/complete",
        { message_id: target.message_id, caption: caption?.trim() || null },
    );
    return msg;
}

/** Отредактировать своё текстовое сообщение. */
export async function editMessage(messageId: string, text: string): Promise<MessageItem> {
    const res = await api.patch<MessageItem>(`/messages/${messageId}`, { text });
    return res.data;
}

/** Удалить своё сообщение (исчезает у обоих участников). */
export async function deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
}

/** Список диалогов текущего пользователя (последнее сообщение + непрочитанные). */
export async function getConversations(): Promise<ConversationPreview[]> {
    const res = await api.get<ConversationPreview[]>("/messages/conversations");
    return res.data;
}

/**
 * Лента диалога с пользователем. before (ISO created_at) — курсор для догрузки
 * истории вверх; без before открытие помечает входящие прочитанными.
 */
export async function getConversation(
    username: string,
    before?: string,
): Promise<MessageItem[]> {
    const res = await api.get<MessageItem[]>(`/messages/with/${username}`, {
        params: before ? { before } : undefined,
    });
    return res.data;
}

/** Число непрочитанных сообщений (для бейджа в шапке). */
export async function getUnreadMessages(): Promise<number> {
    const res = await api.get<{ unread: number }>("/messages/unread-count");
    return res.data.unread;
}
