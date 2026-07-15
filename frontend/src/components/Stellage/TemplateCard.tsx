import type { BoxTemplate } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { formatPrice, resolveRarityVisual } from "../../data/mockTemplates";
import "./TemplateCard.css";

/* Shared box tile used by the Feed grid and the Home feed-teaser.
   Styling lives in FeedPage.css (.template-card*) so both surfaces read identically. */
export const TemplateCard = ({
    template,
    onClick,
    size = 200,
}: {
    template: BoxTemplate;
    onClick: () => void;
    size?: number;
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
                <WireframeBox size={size} rarityGlow={rarityGlow} color={boxColor} contentType={template.contentType} />
            </div>

            <div className="template-card-footer">
                <h3 className="template-title">{template.title}</h3>
                <div className="template-meta">
                    <span className={`rarity-tag rarity-tag-${rarityClass}`}>
                        {template.rarity}
                    </span>
                    <span className="template-price">
                        {formatPrice(template.price, template.currency)}
                    </span>
                </div>
            </div>
        </div>
    );
};
