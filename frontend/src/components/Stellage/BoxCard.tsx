import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { BoxNameLabel } from "./BoxNameLabel";
import { resolveRarityVisual, resolveContentType } from "../../data/mockTemplates";
import "./BoxCard.css";

export const BoxCard = ({ box }: { box: Box }) => {
    const rarityKey = box.template.rarity?.toLowerCase();
    // Тот же визуал, что в ленте: цветные линии wireframe + свечение по редкости.
    const { rarityGlow, boxColor } = resolveRarityVisual(box.template.rarity ?? "common");
    const contentType = resolveContentType(box.template);

    return (
        <div className={`box-card rarity-${rarityKey}`}>
            <div className="box-card-serial">
                <span className="serial">#{box.serial_number}</span>
                {box.is_verified === "verified" && (
                    <span className="verified-badge">✓</span>
                )}
            </div>

            <div className="box-card-visual">
                <WireframeBox size={110} rarityGlow={rarityGlow} color={boxColor} contentType={contentType} />
            </div>

            <div className="box-card-info">
                <h3 className="box-title">
                    <BoxNameLabel name={box.template.title} max={22} className="box-title-text" />
                </h3>
                <div className="box-card-meta">
                    <span className={`rarity-tag rarity-tag-${rarityKey}`} style={{ color: boxColor }}>
                        {box.template.rarity}
                    </span>
                    <span className={`status-tag ${box.is_sealed === "sealed" ? "sealed" : "unsealed"}`}>
                        {box.is_sealed === "sealed" ? "Запечатана" : "Открыта"}
                    </span>
                </div>
            </div>
        </div>
    );
};
