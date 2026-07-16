import { api } from "./instance";
import type { PublicUser } from "../types/Profile/profile";

export type NotificationType = "follow" | "box_like";

export interface NotificationItem {
    id: string;
    type: NotificationType;
    is_read: boolean;
    created_at: string;
    actor: PublicUser;
    box_title?: string | null;
}

export async function getNotifications(): Promise<NotificationItem[]> {
    const res = await api.get<NotificationItem[]>("/notifications");
    return res.data;
}

export async function getUnreadCount(): Promise<number> {
    const res = await api.get<{ unread: number }>("/notifications/unread-count");
    return res.data.unread;
}

export async function markNotificationsRead(): Promise<void> {
    await api.post("/notifications/mark-read");
}
