import { api } from "./instance";
import type { PublicUser } from "../types/Profile/profile";

export interface MessageItem {
    id: string;
    text: string;
    is_read: boolean;
    is_mine: boolean;
    created_at: string;
}

export interface ConversationPreview {
    user: PublicUser;
    last_text: string;
    last_at: string;
    unread: number;
}

/** Отправить личное сообщение пользователю по username. */
export async function sendMessage(toUsername: string, text: string): Promise<MessageItem> {
    const res = await api.post<MessageItem>("/messages/send", {
        to_username: toUsername,
        text,
    });
    return res.data;
}

/** Список диалогов текущего пользователя (последнее сообщение + непрочитанные). */
export async function getConversations(): Promise<ConversationPreview[]> {
    const res = await api.get<ConversationPreview[]>("/messages/conversations");
    return res.data;
}

/** Лента диалога с пользователем (открытие помечает входящие прочитанными). */
export async function getConversation(username: string): Promise<MessageItem[]> {
    const res = await api.get<MessageItem[]>(`/messages/with/${username}`);
    return res.data;
}

/** Число непрочитанных сообщений (для бейджа в шапке). */
export async function getUnreadMessages(): Promise<number> {
    const res = await api.get<{ unread: number }>("/messages/unread-count");
    return res.data.unread;
}
