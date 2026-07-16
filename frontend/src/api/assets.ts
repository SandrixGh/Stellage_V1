import axios from "axios";
import { api } from "./instance";
import type { AssetKind, BoxAsset } from "../types/Stellage/boxes";

/** Разовая presigned POST-цель для прямой загрузки в S3. Не хранить. */
interface AssetUploadTarget {
    asset_id: string;
    url: string;
    fields: Record<string, string>;
    expires_in: number;
}

/** Короткоживущая presigned GET-ссылка (минуты). Не хранить и не кэшировать. */
export interface AssetDownloadUrl {
    url: string;
    expires_in: number;
}

// Дублирует backend/apps/boxes/assets/limits.py ТОЛЬКО для мгновенной
// подсветки ошибок в UI. Настоящая проверка — на сервере и в S3-политике.
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"];
export const MAX_BYTES: Record<AssetKind, number> = {
    photo: 10 * 2 ** 20,   // 10 MB
    video: 200 * 2 ** 20,  // 200 MB
};
export const MAX_ASSETS_PER_BOX = 10;
export const ACCEPT_ATTR = [...PHOTO_MIME_TYPES, ...VIDEO_MIME_TYPES].join(",");

export function kindForMime(mime: string): AssetKind | null {
    if (PHOTO_MIME_TYPES.includes(mime)) return "photo";
    if (VIDEO_MIME_TYPES.includes(mime)) return "video";
    return null;
}

export function formatBytes(bytes: number): string {
    if (bytes >= 2 ** 20) return `${(bytes / 2 ** 20).toFixed(1)} МБ`;
    if (bytes >= 2 ** 10) return `${Math.round(bytes / 2 ** 10)} КБ`;
    return `${bytes} Б`;
}

/** Свежая ссылка на просмотр ассета (после серверной проверки видимости). */
export async function getAssetUrl(assetId: string): Promise<AssetDownloadUrl> {
    const res = await api.get<AssetDownloadUrl>("/boxes/get-asset-url", {
        params: { asset_id: assetId },
    });
    return res.data;
}

export async function deleteAsset(assetId: string): Promise<void> {
    await api.delete("/boxes/delete-asset", { params: { asset_id: assetId } });
}

/**
 * Полный цикл безопасной загрузки: initiate (валидация и presigned POST на
 * бэкенде) → прямой POST файла в S3 → complete (проверка размера/типа/сигнатуры).
 * Байты файла через наш бэкенд не проходят.
 */
export async function uploadBoxAsset(
    instanceId: string,
    file: File,
    onProgress?: (fraction: number) => void,
): Promise<BoxAsset> {
    const kind = kindForMime(file.type);
    if (!kind) throw new Error("Неподдерживаемый тип файла");

    const { data: target } = await api.post<AssetUploadTarget>(
        "/boxes/initiate-asset-upload",
        {
            instance_id: instanceId,
            kind,
            mime: file.type,
            size_bytes: file.size,
            original_name: file.name,
        },
    );

    const form = new FormData();
    Object.entries(target.fields).forEach(([key, value]) => form.append(key, value));
    form.append("file", file); // файл обязан идти последним полем формы

    // Голый axios, НЕ общий api-инстанс: cookie авторизации не должна уходить
    // в S3, а Content-Type (multipart с boundary) выставляет сам браузер.
    await axios.post(target.url, form, {
        withCredentials: false,
        onUploadProgress: (e) => {
            const total = e.total ?? file.size;
            if (total > 0) onProgress?.(Math.min(e.loaded / total, 1));
        },
    });

    const { data: asset } = await api.post<BoxAsset>(
        "/boxes/complete-asset-upload",
        { asset_id: target.asset_id },
    );
    return asset;
}
