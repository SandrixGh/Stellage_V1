import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { BuyBoxModal } from "../../components/Stellage/BuyBoxModal";
import { CommentSection } from "../../components/Stellage/CommentSection";
import { BoxHistoryTimeline } from "../../components/Stellage/BoxHistoryTimeline";
import { Avatar } from "../../components/UI/Avatar";
import { StellaCoinIcon } from "../../components/UI/StellaCoinIcon";
import { LikeButton } from "../../components/UI/LikeButton";
import {
    BoxIcon,
    HistoryIcon,
    CommentsIcon,
    ArrowLeftIcon,
} from "../../components/UI/Icons";
import { useStellageStore } from "../../store/useStellageStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
    getRarityClass,
    resolveRarityVisual,
    resolveContentType,
} from "../../data/mockTemplates";
import "./BoxDetailPage.css";

export const BoxDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const { templates, fetchTemplates, acquireBox } = useStellageStore();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [triedFetch, setTriedFetch] = useState(false);
    const [isAcquiring, setIsAcquiring] = useState(false);
    const [acquired, setAcquired] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"content" | "history" | "comments">("content");

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
            return <div className="status-info">Загрузка информации о коробке…</div>;
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
                {/* Navigation Back */}
                <Link to="/feed" className="box-detail-back-btn">
                    <ArrowLeftIcon size={18} />
                    <span>Назад в ленту</span>
                </Link>

                <div className="box-detail-layout">
                    {/* Left Column: Ambient Wireframe Showcase & Creator specs */}
                    <div className="box-detail-left-col">
                        <div className="box-detail-preview-card">
                            <div className="preview-ambient-glow" style={{ background: rarityGlow ?? undefined }} />
                            <div className="preview-box-wrapper">
                                <WireframeBox
                                    size={210}
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
                                    <span>{resolveContentType(template) === "empty" ? "Пустая" : "Контент внутри"}</span>
                                </span>
                            </div>
                        </div>

                        {/* Creator Card */}
                        <div className="box-detail-creator-card">
                            <Avatar url={template.owner_avatar_url} name={authorNickname} size={46} />
                            <div className="creator-meta">
                                <span className="creator-nickname">{authorNickname}</span>
                                <span className="creator-username">{authorUsername}</span>
                            </div>
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
                                                : "Забрать за StellaCoins"}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Spatial Knowledge Workspace */}
                    <div className="box-detail-right-col">
                        <div className="box-detail-header-row">
                            <h1 className="box-detail-main-title">{template.title}</h1>
                            <LikeButton
                                templateId={template.id}
                                initialLikesCount={template.likes_count ?? 0}
                                initialIsLiked={template.is_liked ?? false}
                            />
                        </div>

                        {template.description && (
                            <div className="box-detail-description-block">
                                <p>{template.description}</p>
                            </div>
                        )}

                        {/* Page Tabs */}
                        <div className="box-detail-nav-tabs">
                            <button
                                className={`box-detail-nav-tab ${activeTab === "content" ? "active" : ""}`}
                                onClick={() => setActiveTab("content")}
                            >
                                <BoxIcon size={16} />
                                <span>Содержимое</span>
                            </button>
                            <button
                                className={`box-detail-nav-tab ${activeTab === "history" ? "active" : ""}`}
                                onClick={() => setActiveTab("history")}
                            >
                                <HistoryIcon size={16} />
                                <span>История</span>
                            </button>
                            <button
                                className={`box-detail-nav-tab ${activeTab === "comments" ? "active" : ""}`}
                                onClick={() => setActiveTab("comments")}
                            >
                                <CommentsIcon size={16} />
                                <span>Комментарии</span>
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="box-detail-tab-content">
                            {activeTab === "content" && (
                                <div className="tab-pane-content">
                                    <p className="box-detail-content-text">
                                        {template.description || "У этой коробки пока нет дополнительного описания."}
                                    </p>
                                </div>
                            )}

                            {activeTab === "history" && (
                                <div className="tab-pane-history">
                                    <BoxHistoryTimeline
                                        createdDate={template.created_at}
                                        creatorUsername={authorNickname}
                                        priceCoins={priceCoins}
                                    />
                                </div>
                            )}

                            {activeTab === "comments" && (
                                <div className="tab-pane-comments">
                                    <CommentSection templateId={template.id} />
                                </div>
                            )}
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
