import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import "./BoxCard.css";

const rarityGlowMap: Record<string, "rare" | "golden" | "dev" | null> = {
    rare: "rare",
    golden: "golden",
    "developer's": "dev",
    dev: "dev",
};

export const BoxCard = ({ box }: { box: Box }) => {
    const rarityKey = box.template.rarity?.toLowerCase();
    const rarityGlow = rarityGlowMap[rarityKey] ?? null;

    return (
        <div className={`box-card rarity-${rarityKey}`}>
            <div className="box-card-serial">
                <span className="serial">#{box.serial_number}</span>
                {box.is_verified === "verified" && (
                    <span className="verified-badge">✓</span>
                )}
            </div>

            <div className="box-card-visual">
                <WireframeBox size={110} rarityGlow={rarityGlow} />
            </div>

            <div className="box-card-info">
                <h3 className="box-title">{box.template.title}</h3>
                <div className="box-card-meta">
                    <span className={`rarity-tag rarity-tag-${rarityKey}`}>
                        {box.template.rarity}
                    </span>
                    <span className={`status-tag ${box.is_sealed}`}>
                        {box.is_sealed === "sealed" ? "Запечатана" : "Открыта"}
                    </span>
                </div>
            </div>
        </div>
    );
};
