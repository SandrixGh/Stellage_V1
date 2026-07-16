import { useCallback, useEffect, useRef, useState } from "react";
import { getAssetUrl } from "../../api/assets";
import type { BoxAsset } from "../../types/Stellage/boxes";
import "./AssetViewer.css";

interface AssetViewerProps {
    asset: BoxAsset;
    /** Компактное превью-плитка (сетка быстрого просмотра): видео без
     *  controls, клик по плитке разворачивает в лайтбокс. */
    thumb?: boolean;
}

/**
 * Просмотр одного S3-ассета. Presigned-ссылка живёт минуты и запрашивается
 * при монтировании; если она успела истечь (onError от img/video) — один раз
 * перезапрашиваем свежую, дальше показываем ошибку.
 */
export const AssetViewer = ({ asset, thumb = false }: AssetViewerProps) => {
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const retried = useRef(false);

    const load = useCallback(async () => {
        try {
            const target = await getAssetUrl(asset.id);
            setUrl(target.url);
        } catch {
            setFailed(true);
        }
    }, [asset.id]);

    useEffect(() => {
        retried.current = false;
        setUrl(null);
        setFailed(false);
        load();
    }, [load]);

    const handleMediaError = () => {
        if (retried.current) {
            setFailed(true);
            return;
        }
        retried.current = true;
        setUrl(null);
        load();
    };

    if (failed) {
        return (
            <div className="asset-viewer asset-viewer-fallback">
                Не удалось показать «{asset.original_name}»
            </div>
        );
    }

    if (!url) {
        return <div className="asset-viewer asset-viewer-skeleton" aria-hidden="true" />;
    }

    if (asset.kind === "photo") {
        return (
            <img
                className="asset-viewer"
                src={url}
                alt={asset.original_name}
                loading="lazy"
                onError={handleMediaError}
            />
        );
    }

    return (
        <video
            className="asset-viewer"
            src={url}
            // В превью-плитке контролы не нужны (клик открывает лайтбокс);
            // грузим только метаданные ради первого кадра-постера.
            controls={!thumb}
            muted={thumb}
            preload="metadata"
            onError={handleMediaError}
        />
    );
};
