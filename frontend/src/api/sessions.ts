import { api } from "./instance";

/**
 * Аккаунт, залогиненный на этом устройстве. Список ведёт сервер (подписанная
 * cookie DeviceAccounts + живые refresh-сессии в Redis), поэтому переключение
 * не требует пароля — сервер сам перевыпускает cookie активного аккаунта.
 */
export interface DeviceAccount {
    id: string;
    email: string;
    username: string | null;
    nickname: string | null;
    avatar_url: string | null;
    is_current: boolean;
}

/** Аккаунты устройства для меню быстрого переключения. */
export async function getDeviceAccounts(): Promise<DeviceAccount[]> {
    const res = await api.get<DeviceAccount[]>("/auth/sessions");
    return res.data;
}

/** Мгновенно переключиться на другой аккаунт устройства (без пароля). */
export async function switchAccount(userId: string): Promise<void> {
    await api.post(`/auth/switch/${userId}`);
}

/** Убрать чужой аккаунт из устройства (revoke сессии). */
export async function unlinkAccount(userId: string): Promise<void> {
    await api.delete(`/auth/sessions/${userId}`);
}
