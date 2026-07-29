import { memo } from "react";
import type { BoxTemplate } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { formatPrice, resolveRarityVisual, resolveContentType } from "../../data/mockTemplates";
import "./TemplateCard.css";

export const TemplateCard = memo(({
    template,
    onClick,
    size = 200,
    actionNode,
}: {
    template: BoxTemplate;
    onClick: () => void;
    size?: number;
    actionNode?: React.ReactNode;
}) => {
    const { rarityGlow, rarityClass, boxColor } = resolveRarityVisual(
        template.rarity ?? "common",
    );

    return (
        <div
            className={`template-card rarity-${rarityClass}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onClick();
            }}
        >
            <div className="template-card-visual">
                <span className={`template-badge rarity-badge-${rarityClass}`}>
                    {template.rarity}
                </span>
                <WireframeBox size={size} rarityGlow={rarityGlow} color={boxColor} contentType={resolveContentType(template)} />
            </div>

            <div className="template-card-footer">
                <h3 className="template-title">{template.title}</h3>
                <div className="template-action-row">
                    {actionNode ? (
                        actionNode
                    ) : (
                        <span className="template-price">
                            {formatPrice(template.price, template.currency)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

