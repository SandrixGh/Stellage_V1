import React from "react";
import { useNavigate } from "react-router-dom";
import type { BoxTemplate } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { resolveContentType, resolveRarityVisual } from "../../data/mockTemplates";
import { Avatar } from "../UI/Avatar";
import { StellaCoinIcon } from "../UI/StellaCoinIcon";
import { LikeButton } from "../UI/LikeButton";
import "./TemplateCard.css";

interface TemplateCardProps {
    template: BoxTemplate;
    onClick?: () => void;
    onAcquireClick?: (template: BoxTemplate) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    onClick,
    onAcquireClick,
}) => {
    const navigate = useNavigate();
    const rarityKey = (template.rarity || "common").toLowerCase();
    const { rarityGlow, boxColor } = resolveRarityVisual(template.rarity || "common");
    const contentType = resolveContentType(template);
    const priceNum = Number(template.price || 0);

    // Display author avatar & names
    const authorNickname = template.owner_nickname?.trim() || template.owner_username || "Stellage";
    const authorUsername = template.owner_username ? `@${template.owner_username}` : "@stellage";

    const handleCommentsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/box/${template.id}`);
    };

    return (
        <div className={`template-card rarity-${rarityKey}`} onClick={onClick}>
            {/* Card Header: Author Avatar & Nickname / Username */}
            <div className="template-card-header">
                <div className="template-card-author">
                    <Avatar url={template.owner_avatar_url} name={authorNickname} size={34} />
                    <div className="author-text-meta">
                        <span className="author-nickname">{authorNickname}</span>
                        <span className="author-username">{authorUsername}</span>
                    </div>
                </div>
            </div>

            {/* Wireframe Box Visual with Content Type Glyph */}
            <div className="template-card-visual">
                <WireframeBox
                    size={135}
                    rarityGlow={rarityGlow}
                    color={boxColor}
                    contentType={contentType}
                />
            </div>

            {/* Title (Single / Clamped 2 Lines, No Description) */}
            <div className="template-card-body">
                <h3 className="template-card-title">{template.title}</h3>
            </div>

            {/* Footer Row: Price & Action Buttons */}
            <div className="template-card-footer">
                <div className="template-card-price-row">
                    <div className="template-card-price">
                        {priceNum === 0 ? (
                            <span className="price-free">Бесплатно</span>
                        ) : (
                            <span className="price-stella">
                                <StellaCoinIcon size={18} /> {priceNum.toLocaleString("ru-RU")}
                            </span>
                        )}
                    </div>

                    <div className="template-card-social-actions">
                        <LikeButton
                            templateId={template.id}
                            initialLikesCount={template.likes_count ?? 0}
                            initialIsLiked={template.is_liked ?? false}
                        />

                        <button
                            type="button"
                            className="template-card-comments-btn"
                            onClick={handleCommentsClick}
                            title="Открыть комментарии"
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>{template.comments_count ?? 0}</span>
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    className="template-card-buy-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onAcquireClick) onAcquireClick(template);
                        else if (onClick) onClick();
                    }}
                >
                    {priceNum === 0 ? (
                        "Забрать бесплатно"
                    ) : (
                        <>
                            <span>Забрать за</span>
                            <StellaCoinIcon size={15} />
                            <span>{priceNum.toLocaleString("ru-RU")}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
