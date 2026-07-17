import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getAssetUrl } from "../../api/assets";
import type { BoxAsset } from "../../types/Stellage/boxes";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import "./AssetLightbox.css";

interface AssetLightboxProps {
    assets: BoxAsset[];
    startIndex: number;
    onClose: () => void;
}

/**
 * Полноэкранный просмотр ассетов коробки поверх модалки: крупный кадр/плеер,
 * листание ←/→ по всем ассетам, Esc — закрыть. Presigned-ссылка живёт минуты и
 * тянется лениво под текущий индекс; при истечении (onError) один раз
 * перезапрашивается свежая. Соседние ассеты предзагружаются для мгновенного
 * листания.
 */
export const AssetLightbox = ({ assets, startIndex, onClose }: AssetLightboxProps) => {
    const [index, setIndex] = useState(startIndex);
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const retried = useRef(false);
    useBodyScrollLock();

    const count = assets.length;
    const asset = assets[index];

    const go = useCallback(
        (delta: number) => {
            if (count < 2) return;
            setIndex((i) => (i + delta + count) % count);
        },
        [count],
    );

    const load = useCallback(async () => {
        if (!asset) return;
        try {
            const target = await getAssetUrl(asset.id);
            setUrl(target.url);
        } catch {
            setFailed(true);
        }
    }, [asset]);

    // Свежая ссылка под текущий ассет.
    useEffect(() => {
        retried.current = false;
        setUrl(null);
        setFailed(false);
        load();
    }, [load]);

    // Предзагрузка соседних фото — чтобы листание было мгновенным.
    useEffect(() => {
        if (count < 2) return;
        const neighbours = [(index + 1) % count, (index - 1 + count) % count];
        neighbours.forEach(async (i) => {
            const next = assets[i];
            if (!next || next.kind !== "photo") return;
            try {
                const target = await getAssetUrl(next.id);
                const img = new Image();
                img.src = target.url;
            } catch {
                /* предзагрузка необязательна — молча пропускаем */
            }
        });
    }, [index, count, assets]);

    // Клавиатура: стрелки листают, Esc закрывает.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowRight") go(1);
            else if (e.key === "ArrowLeft") go(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [go, onClose]);

    const handleMediaError = () => {
        if (retried.current) {
            setFailed(true);
            return;
        }
        retried.current = true;
        setUrl(null);
        load();
    };

    if (!asset) return null;

    return createPortal(
        <div className="lightbox-overlay" onClick={onClose}>
            <button
                type="button"
                className="lightbox-close"
                aria-label="Закрыть"
                onClick={onClose}
            >
                ✕
            </button>

            {count > 1 && (
                <button
                    type="button"
                    className="lightbox-nav lightbox-prev"
                    aria-label="Предыдущий"
                    onClick={(e) => {
                        e.stopPropagation();
                        go(-1);
                    }}
                >
                    ‹
                </button>
            )}

            <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
                {failed ? (
                    <div className="lightbox-fallback">
                        Не удалось показать «{asset.original_name}»
                    </div>
                ) : !url ? (
                    <div className="lightbox-skeleton" aria-hidden="true" />
                ) : asset.kind === "photo" ? (
                    <img
                        className="lightbox-media"
                        src={url}
                        alt={asset.original_name}
                        onError={handleMediaError}
                    />
                ) : (
                    <video
                        className="lightbox-media"
                        src={url}
                        controls
                        autoPlay
                        onError={handleMediaError}
                    />
                )}
            </div>

            {count > 1 && (
                <button
                    type="button"
                    className="lightbox-nav lightbox-next"
                    aria-label="Следующий"
                    onClick={(e) => {
                        e.stopPropagation();
                        go(1);
                    }}
                >
                    ›
                </button>
            )}

            <div className="lightbox-caption" onClick={(e) => e.stopPropagation()}>
                <span className="lightbox-name">{asset.original_name}</span>
                {count > 1 && (
                    <span className="lightbox-counter">
                        {index + 1} / {count}
                    </span>
                )}
            </div>
        </div>,
        document.body,
    );
};
