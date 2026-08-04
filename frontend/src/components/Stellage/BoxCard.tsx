import { memo } from "react";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import { LikeButton } from "../UI/LikeButton";
import "./BoxCard.css";

export const BoxCard = memo(({ box }: { box: Box }) => {
    const rarityKey = (box.template.rarity || "common").toLowerCase();
    const { rarityGlow, boxColor } = resolveRarityVisual(box.template.rarity ?? "common");
    const contentType = resolveBoxContentType(box);
    const isSealed = box.is_sealed === "sealed";

    const coverUrl = (box as any).cover_url || (box as any).preview_url || null;

    return (
        <div className={`box-card rarity-${rarityKey}`}>
            <div className="box-card-visual">
                <WireframeBox
                    size={130}
                    rarityGlow={rarityGlow}
                    color={boxColor}
                    contentType={contentType}
                    variant="2.5d-slot"
                    coverUrl={coverUrl}
                />
            </div>

            <div className="box-card-info">
                <h3 className="box-title">{box.template.title}</h3>

                <div className="box-card-sub">
                    <span className="box-serial">#{box.serial_number}</span>
                    <span className="dot-sep">•</span>
                    <span className={`rarity-name rarity-color-${rarityKey}`}>
                        {box.template.rarity}
                    </span>
                    <span className="dot-sep">•</span>
                    <span className="status-name">
                        {isSealed ? "Запечатана" : "Открыта"}
                    </span>
                </div>

                <div className="box-card-footer">
                    <LikeButton
                        instanceId={box.id}
                        initialLikesCount={box.likes_count ?? 0}
                        initialIsLiked={box.is_liked ?? false}
                    />
                </div>
            </div>
        </div>
    );
});
