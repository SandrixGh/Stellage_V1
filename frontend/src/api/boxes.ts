import { api } from "./instance";
import type { Box } from "../types/Stellage/boxes";
import type { PublicUser } from "../types/Profile/profile";

/** Детальный публичный просмотр коробки (страница /box/:id). owner — карточка
 *  владельца, is_owner — текущий пользователь владелец (показываем действия). */
export interface BoxPublicView {
    box: Box;
    owner: PublicUser & { bio?: string | null };
    is_owner: boolean;
}

/**
 * Детальный просмотр коробки. Работает и для чужой публичной коробки на
 * публичной полке (бэкенд решает видимость: невидимая/несуществующая → 404).
 */
export async function getBoxView(instanceId: string): Promise<BoxPublicView> {
    const res = await api.get<BoxPublicView>("/boxes/box-view", {
        params: { instance_id: instanceId },
    });
    return res.data;
}
