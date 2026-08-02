import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { BuyBoxModal } from "../../components/Stellage/BuyBoxModal";
import { CommentSection } from "../../components/Stellage/CommentSection";
import { Avatar } from "../../components/UI/Avatar";
import { StellaCoinIcon } from "../../components/UI/StellaCoinIcon";
import { LikeButton } from "../../components/UI/LikeButton";
import { useStellageStore } from "../../store/useStellageStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
    getRarityClass,
    resolveRarityVisual,
    resolveContentType,
} from "../../data/mockTemplates";
import "./BoxDetailPage.css";

const formatDate = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
};

export const BoxDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const { templates, fetchTemplates, acquireBox } = useStellageStore();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [triedFetch, setTriedFetch] = useState(false);
    const [isAcquiring, setIsAcquiring] = useState(false);
    const [acquired, setAcquired] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState(false);

    useEffect(() => {
        if (templates.length === 0) {
            fetchTemplates().finally(() => setTriedFetch(true));
        } else {
            setTriedFetch(true);
        }
    }, []);

    const template = templates.find((t) => t.id === id);

    if (!template) {
        if (!triedFetch) {
            return <div className="status-info">Загрузка информации о коробке...</div>;
        }
        return <Navigate to="/feed" replace />;
    }

    const { rarityGlow, boxColor } = resolveRarityVisual(template.rarity);
    const rarityClass = getRarityClass(template.rarity);
    const priceCoins = Math.round(Number(template.price) || 0);
    const isFree = priceCoins === 0;

    const authorNickname = template.owner_username || "Stellage";
    const authorUsername = template.owner_username ? `@${template.owner_username}` : "@stellage";

    const handleAcquire = async () => {
        if (isAcquiring || acquired) return;
        if (!isFree) {
            setShowBuyModal(true);
            return;
        }
        setIsAcquiring(true);
        await acquireBox(template.id);
        setIsAcquiring(false);
        setAcquired(true);
    };

    return (
        <div className={`box-detail-page rarity-${rarityClass}`}>
            <div className="box-detail-container">
                {/* Back Button */}
                <Link to="/feed" className="box-detail-back-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Назад в ленту</span>
                </Link>

                <div className="box-detail-layout">
                    {/* Left Column: Glass Preview & Specs Showcase */}
                    <div className="box-detail-preview-card">
                        <div className="preview-ambient-glow" style={{ background: rarityGlow ?? undefined }} />
                        <div className="preview-box-wrapper">
                            <WireframeBox
                                size={200}
                                rarityGlow={rarityGlow}
                                color={boxColor}
                                contentType={resolveContentType(template)}
                            />
                        </div>
                        <div className="preview-specs-chips">
                            <span className={`detail-rarity-chip rarity-${rarityClass}`}>
                                {template.rarity || "COMMON"}
                            </span>
                            <span className="detail-spec-chip">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: "4px" }}>
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span>{resolveContentType(template) === "empty" ? "Пустая" : "Контент внутри"}</span>
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Meta & Details */}
                    <div className="box-detail-content-card">
                        {/* Header Badge & Like Button */}
                        <div className="box-detail-header-row">
                            <h1 className="box-detail-main-title">{template.title}</h1>
                            <LikeButton
                                templateId={template.id}
                                initialLikesCount={template.likes_count ?? 0}
                            />
                        </div>

                        {/* Creator Card */}
                        <div className="box-detail-creator-card">
                            <Avatar url={template.owner_avatar_url} name={authorNickname} size={42} />
                            <div className="creator-meta">
                                <span className="creator-nickname">{authorNickname}</span>
                                <span className="creator-username">{authorUsername}</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="box-detail-description-block">
                            <p>{template.description || "У этой коробки пока нет описания."}</p>
                        </div>

                        {/* Price & Primary CTA */}
                        <div className="box-detail-action-card">
                            <div className="box-detail-price-box">
                                <span className="price-label">Стоимость:</span>
                                <div className="price-value">
                                    {isFree ? (
                                        <span className="free-tag">Бесплатно</span>
                                    ) : (
                                        <span className="coin-tag">
                                            <StellaCoinIcon size={22} />
                                            <span>{priceCoins.toLocaleString("ru-RU")}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="box-detail-acquire-btn"
                                onClick={handleAcquire}
                                disabled={!isAuthenticated || isAcquiring || (isFree && acquired)}
                            >
                                {!isAuthenticated
                                    ? "Войдите, чтобы получить"
                                    : acquired
                                        ? "В вашей коллекции ✓"
                                        : isAcquiring
                                            ? "Обработка…"
                                            : isFree
                                                ? "Получить бесплатно"
                                                : "Забрать за Stellacoin"}
                            </button>
                        </div>

                        {/* Meta info */}
                        <div className="box-detail-meta-grid">
                            <div className="meta-item">
                                <span className="meta-item-label">Дата создания</span>
                                <span className="meta-item-val">{formatDate(template.created_at)}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-item-label">Автор</span>
                                <span className="meta-item-val">{authorNickname}</span>
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="box-detail-comments-container">
                            <h3 className="comments-heading">Обсуждение коробки</h3>
                            <CommentSection templateId={template.id} />
                        </div>
                    </div>
                </div>
            </div>

            {showBuyModal && (
                <BuyBoxModal
                    template={template}
                    onClose={() => setShowBuyModal(false)}
                    onSuccess={() => setAcquired(true)}
                />
            )}
        </div>
    );
};
