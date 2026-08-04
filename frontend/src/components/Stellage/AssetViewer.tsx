import { useEffect, useRef, useState } from "react";
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

    // Свежая ссылка под текущий asset.id. cancelled-флаг защищает от гонки,
    // если родитель быстро подменит asset: ответ старого не перезапишет новый.
    useEffect(() => {
        retried.current = false;
        setUrl(null);
        setFailed(false);
        let cancelled = false;
        (async () => {
            try {
                const target = await getAssetUrl(asset.id);
                if (!cancelled) setUrl(target.url);
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [asset.id]);

    const handleMediaError = async () => {
        if (retried.current) {
            setFailed(true);
            return;
        }
        retried.current = true;
        setUrl(null);
        // Осознанный повтор для текущего ассета (например истёкшая ссылка).
        try {
            const target = await getAssetUrl(asset.id);
            setUrl(target.url);
        } catch {
            setFailed(true);
        }
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

    if (thumb) {
        return (
            <div className="asset-viewer asset-viewer-thumb-video" style={{ position: "relative", width: "100%", height: "100%" }}>
                <video
                    className="asset-viewer-video-poster"
                    src={url}
                    controls={false}
                    muted
                    preload="metadata"
                    onError={handleMediaError}
                    style={{ pointerEvents: "none", width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div className="video-thumb-play-overlay">
                    <div className="video-thumb-play-badge">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <video
            className="asset-viewer"
            src={url}
            controls
            preload="metadata"
            onError={handleMediaError}
        />
    );
};
