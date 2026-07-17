import { useState } from "react";
import { AssetViewer } from "./AssetViewer";
import { AssetLightbox } from "./AssetLightbox";
import type { BoxAsset } from "../../types/Stellage/boxes";
import "./ContentGrid.css";

interface ContentGridProps {
    assets: BoxAsset[];
    /** Плотный режим — плитки мельче (для чата/попапа). По умолчанию обычный. */
    dense?: boolean;
}

/**
 * Сетка превью контента (фото/видео) с просмотром «поближе». Плитки квадратные,
 * заполняют строку по auto-fill; клик по плитке открывает полноэкранный
 * AssetLightbox с листанием. Единый компонент для страницы коробки, модалки
 * коробки и мессенджера — раньше сетка была скопирована в трёх местах.
 */
export const ContentGrid = ({ assets, dense = false }: ContentGridProps) => {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    if (assets.length === 0) return null;

    return (
        <>
            <div className={`content-grid${dense ? " dense" : ""}`}>
                {assets.map((asset, i) => (
                    <button
                        key={asset.id}
                        type="button"
                        className="content-grid-tile"
                        onClick={() => setLightboxIndex(i)}
                        aria-label={`Открыть «${asset.original_name}»`}
                    >
                        <AssetViewer asset={asset} thumb />
                        {asset.kind === "video" && (
                            <span className="content-grid-play" aria-hidden="true">
                                ▶
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {lightboxIndex !== null && (
                <AssetLightbox
                    assets={assets}
                    startIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </>
    );
};
