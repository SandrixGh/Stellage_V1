import { memo } from "react";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { BoxNameLabel } from "./BoxNameLabel";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import { formatCount } from "../../utils/formatCount";
import "./BoxCard.css";

export const BoxCard = memo(({ box }: { box: Box }) => {
    const rarityKey = box.template.rarity?.toLowerCase();
    const { rarityGlow, boxColor } = resolveRarityVisual(box.template.rarity ?? "common");
    const contentType = resolveBoxContentType(box);

    return (
        <div className={`box-card rarity-${rarityKey}`}>
            <div className="box-card-visual">
                <span className={`template-badge rarity-badge-${rarityKey}`}>
                    {box.template.rarity}
                </span>
                <div className="box-card-serial">
                    <span className="serial">#{box.serial_number}</span>
                    {box.is_verified === "verified" && (
                        <span className="verified-badge">✓</span>
                    )}
                </div>
                <WireframeBox size={140} rarityGlow={rarityGlow} color={boxColor} contentType={contentType} />
            </div>

            <div className="box-card-info">
                <h3 className="box-title">
                    <BoxNameLabel name={box.template.title} max={22} className="box-title-text" />
                </h3>
                <div className="box-card-meta">
                    {box.likes_count > 0 && (
                        <span className="box-likes-tag" title={`${box.likes_count} лайков`}>
                            ♥ {formatCount(box.likes_count)}
                        </span>
                    )}
                    <span className={`status-tag ${box.is_sealed === "sealed" ? "sealed" : "unsealed"}`}>
                        {box.is_sealed === "sealed" ? "Запечатана" : "Открыта"}
                    </span>
                </div>
            </div>
        </div>
    );
});

