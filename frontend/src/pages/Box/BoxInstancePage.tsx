import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBoxView, type BoxPublicView } from "../../api/boxes";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { AssetViewer } from "../../components/Stellage/AssetViewer";
import { StellageVideoLightbox } from "../../components/Stellage/StellageVideoPlayer";
import { StellageImageLightbox } from "../../components/Stellage/StellageImageLightbox";
import { BoxHistoryTimeline } from "../../components/Stellage/BoxHistoryTimeline";
import { CommentSection } from "../../components/Stellage/CommentSection";
import { LikeButton } from "../../components/Stellage/LikeButton";
import { Avatar } from "../../components/UI/Avatar";
import { StellaCoinIcon } from "../../components/UI/StellaCoinIcon";
import {
    BoxIcon,
    SpecsIcon,
    HistoryIcon,
    CommentsIcon,
    LockIcon,
    EyeIcon,
    ArrowLeftIcon,
    UnsealIcon,
} from "../../components/UI/Icons";
import { SmartContentInspector } from "../../components/Stellage/SmartContentInspector";
import { StudyContainerSlot } from "../../components/Stellage/StudyContainerSlot";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { useStudyStore } from "../../store/useStudyStore";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import { rarityKey } from "../../utils/rarity";
import "./BoxInstancePage.css";

const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    } catch {
        return iso;
    }
};

export const BoxInstancePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const studyModeEnabled = useStudyStore((s) => s.studyModeEnabled);
    const unsealBox = useStellageStore((s) => s.unsealBox);
    const moveBox = useStellageStore((s) => s.moveBox);

    const [view, setView] = useState<BoxPublicView | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeTab, setActiveTab] = useState<"content" | "study" | "specs" | "history" | "comments">("content");
    const [mediaFilter, setMediaFilter] = useState<"all" | "text" | "photo" | "video">("all");
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [unsealing, setUnsealing] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        setNotFound(false);
        getBoxView(id)
            .then((v) => {
                if (!cancelled) setView(v);
            })
            .catch(() => {
                if (!cancelled) setNotFound(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return <div className="box-page-status-info">Загрузка информации о коробке…</div>;
    }
    if (notFound || !view || !view.box || !view.box.template || !view.owner) {
        return (
            <div className="box-page-missing-wrapper">
                <div className="box-page-missing-card">
                    <LockIcon size={40} className="missing-icon" />
                    <h2>Модуль недоступен</h2>
                    <p>Коробка не найдена, перемещена или скрыта настройками приватности владельца.</p>
                    <button type="button" className="box-page-missing-btn" onClick={() => navigate(-1)}>
                        <ArrowLeftIcon size={16} />
                        <span>Вернуться назад</span>
                    </button>
                </div>
            </div>
        );
    }

    const { box, owner, is_owner } = view;
    const { template } = box;
    const key = rarityKey(template.rarity);
    const { rarityGlow: glow, boxColor } = resolveRarityVisual(template.rarity ?? "common");
    const contentText = typeof box.content?.text === "string" ? box.content.text : "";
    const assets = box.assets ?? [];
    const ownerName = owner.nickname?.trim() || owner.username || "Пользователь";
    const isSealed = box.is_sealed === "sealed";
    const isCreator = !!user && !!template.creator_id && template.creator_id === user.id;
    const canViewContent = !isSealed || is_owner || isCreator;
    const priceCoins = Math.round(Number(template.price) || 0);
    const onShelf = box.shelf_id !== null;

    const handleUnseal = async () => {
        if (busy || unsealing) return;
        setUnsealing(true);
        const fresh = await unsealBox(box.id);
        if (fresh) {
            setView({ ...view, box: fresh });
        }
        setTimeout(() => setUnsealing(false), 500);
    };

    const handleRemoveFromShelf = async () => {
        if (busy) return;
        setBusy(true);
        await moveBox(box.id, null);
        setBusy(false);
        navigate(-1);
    };

    const activeAsset = lightboxIndex !== null ? assets[lightboxIndex] : null;

    return (
        <div className={`box-instance-page rarity-${key}`}>
            <div className="box-instance-container">
                {/* Back Navigation */}
                <button type="button" className="box-instance-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeftIcon size={18} />
                    <span>Назад в инвентарь / полку</span>
                </button>

                <div className="box-instance-layout">
                    {/* Left Column: Visual Showcase & Specifications */}
                    <div className="box-instance-left">
                        <div className="box-instance-preview-card">
                            <div className="preview-ambient-glow" style={{ background: glow ?? undefined }} />
                            <div className="preview-box-wrapper">
                                <WireframeBox
                                    size={230}
                                    rarityGlow={glow}
                                    color={boxColor}
                                    contentType={resolveBoxContentType(box)}
                                />
                            </div>
                            <div className="preview-specs-chips">
                                <span className={`instance-rarity-chip rarity-tag-${key}`} style={{ color: boxColor }}>
                                    {template.rarity || "COMMON"}
                                </span>
                                <span className="instance-serial-chip">#{box.serial_number}</span>
                                <span className="instance-seal-chip">
                                    {isSealed ? "Запечатана" : "Распечатана"}
                                </span>
                            </div>
                        </div>

                        {/* Owner Card */}
                        <div className="box-instance-owner-card">
                            <Avatar url={owner.avatar_url} name={ownerName} size={46} />
                            <div className="owner-meta">
                                <span className="owner-name">{ownerName}</span>
                                <span className="owner-username">@{owner.username || "stellage"}</span>
                            </div>
                        </div>

                        {/* Actions Card */}
                        {is_owner && (
                            <div className="box-instance-owner-actions">
                                {onShelf && (
                                    <button
                                        type="button"
                                        className="instance-btn secondary"
                                        onClick={handleRemoveFromShelf}
                                        disabled={busy}
                                    >
                                        Снять с полки
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Spatial Knowledge Workspace */}
                    <div className="box-instance-right">
                        <div className="box-instance-header">
                            <div className="title-row">
                                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                                    <h1 className="box-instance-title">{template.title}</h1>
                                    <LikeButton instanceId={box.id} canLike={!!user} />
                                </div>
                                <div className="box-instance-price-badge">
                                    <StellaCoinIcon size={20} />
                                    <span>{priceCoins}</span>
                                </div>
                            </div>
                            {template.description && (
                                <p className="box-instance-desc">{template.description}</p>
                            )}
                        </div>

                        {/* Navigation Tabs */}
                        <div className="box-instance-tabs">
                            <button
                                className={`box-instance-tab ${activeTab === "content" ? "active" : ""}`}
                                onClick={() => setActiveTab("content")}
                            >
                                <BoxIcon size={16} />
                                <span>Содержимое</span>
                            </button>
                            {studyModeEnabled && (
                                <button
                                    className={`box-instance-tab ${activeTab === "study" ? "active" : ""}`}
                                    onClick={() => setActiveTab("study")}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                    </svg>
                                    <span>Учёба</span>
                                </button>
                            )}
                            <button
                                className={`box-instance-tab ${activeTab === "specs" ? "active" : ""}`}
                                onClick={() => setActiveTab("specs")}
                            >
                                <SpecsIcon size={16} />
                                <span>Информация</span>
                            </button>
                            <button
                                className={`box-instance-tab ${activeTab === "history" ? "active" : ""}`}
                                onClick={() => setActiveTab("history")}
                            >
                                <HistoryIcon size={16} />
                                <span>История</span>
                            </button>
                            <button
                                className={`box-instance-tab ${activeTab === "comments" ? "active" : ""}`}
                                onClick={() => setActiveTab("comments")}
                            >
                                <CommentsIcon size={16} />
                                <span>Обсуждение</span>
                            </button>
                        </div>

                        {/* Tab Content Panes */}
                        <div className="box-instance-pane">
                            {/* TAB: STUDY */}
                            {activeTab === "study" && (
                                <div className="pane-content-wrapper">
                                    <StudyContainerSlot box={box} />
                                </div>
                            )}

                            {/* TAB 1: CONTENT */}
                            {activeTab === "content" && (
                                <div className="pane-content-wrapper">
                                    {!canViewContent ? (
                                        <div className="sealed-secret-card">
                                            <LockIcon size={36} className="sealed-lock-svg" />
                                            <h4>Запечатанный модуль</h4>
                                            <p>
                                                Содержимое скрыто автором @{owner.username || "Stellage"}.
                                                Заглянуть внутрь сможет только владелец после распаковки.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {isSealed && isCreator && (
                                                <div className="creator-sealed-notice">
                                                    <EyeIcon size={16} />
                                                    <span><strong>Право создателя:</strong> Коробка запечатана для покупателей, но доступна вам как автору.</span>
                                                </div>
                                            )}

                                            {is_owner && isSealed && (
                                                <div className="unseal-action-banner">
                                                    <div className="banner-text">
                                                        <strong>Коробка запечатана</strong>
                                                        <span>Распечатайте, чтобы навсегда раскрыть контент</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="unseal-primary-btn"
                                                        onClick={handleUnseal}
                                                        disabled={busy || unsealing}
                                                    >
                                                        <UnsealIcon size={16} />
                                                        <span>{unsealing ? "Распаковка…" : "Распечатать"}</span>
                                                    </button>
                                                </div>
                                            )}

                                            {/* Media Filter Pills */}
                                            {(assets.length > 0 || contentText) && (
                                                <div className="box-media-filter-bar">
                                                    <button
                                                        type="button"
                                                        className={`filter-pill ${mediaFilter === "all" ? "active" : ""}`}
                                                        onClick={() => setMediaFilter("all")}
                                                    >
                                                        Все файлы ({assets.length + (contentText ? 1 : 0)})
                                                    </button>
                                                    {contentText && (
                                                        <button
                                                            type="button"
                                                            className={`filter-pill ${mediaFilter === "text" ? "active" : ""}`}
                                                            onClick={() => setMediaFilter("text")}
                                                        >
                                                            Текст & Код
                                                        </button>
                                                    )}
                                                    {assets.some((a) => a.kind === "photo") && (
                                                        <button
                                                            type="button"
                                                            className={`filter-pill ${mediaFilter === "photo" ? "active" : ""}`}
                                                            onClick={() => setMediaFilter("photo")}
                                                        >
                                                            Фото
                                                        </button>
                                                    )}
                                                    {assets.some((a) => a.kind === "video") && (
                                                        <button
                                                            type="button"
                                                            className={`filter-pill ${mediaFilter === "video" ? "active" : ""}`}
                                                            onClick={() => setMediaFilter("video")}
                                                        >
                                                            Видео
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Smart Inspector for Text & Code */}
                                            {(contentText || box.content?.blocks) && (mediaFilter === "all" || mediaFilter === "text") && (
                                                <SmartContentInspector content={contentText} rawContent={box.content} boxTitle={template.title} />
                                            )}

                                            {/* Assets Grid */}
                                            {assets.length > 0 && (
                                                <div className="box-instance-assets-grid">
                                                    {assets
                                                        .filter((a) => mediaFilter === "all" || a.kind === mediaFilter)
                                                        .map((asset) => (
                                                            <div key={asset.id} className="instance-asset-card">
                                                                <button
                                                                    type="button"
                                                                    className="instance-thumb-btn"
                                                                    onClick={() => setLightboxIndex(assets.indexOf(asset))}
                                                                >
                                                                    <AssetViewer asset={asset} thumb />
                                                                    <span className="asset-title">{asset.original_name}</span>
                                                                </button>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}

                                            {!contentText && assets.length === 0 && (
                                                <div className="instance-empty-notice">
                                                    {is_owner ? "Коробка пока пуста." : "Содержимое скрыто или коробка пуста."}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: SPECS */}
                            {activeTab === "specs" && (
                                <div className="pane-specs-wrapper">
                                    <dl className="instance-specs-list">
                                        <div className="spec-row">
                                            <dt>Стоимость</dt>
                                            <dd className="price-val">
                                                <StellaCoinIcon size={16} />
                                                <span>{priceCoins} StellaCoins</span>
                                            </dd>
                                        </div>
                                        <div className="spec-row">
                                            <dt>Серийный номер</dt>
                                            <dd>#{box.serial_number}</dd>
                                        </div>
                                        <div className="spec-row">
                                            <dt>Статус герметичности</dt>
                                            <dd>{box.is_sealed === "sealed" ? "Запечатана" : "Распечатана"}</dd>
                                        </div>
                                        <div className="spec-row">
                                            <dt>Доступность</dt>
                                            <dd>{box.is_public === "public" ? "Публичная" : "Приватная"}</dd>
                                        </div>
                                        <div className="spec-row">
                                            <dt>Владелец</dt>
                                            <dd>@{owner.username || "Stellage"}</dd>
                                        </div>
                                        <div className="spec-row">
                                            <dt>Дата минта</dt>
                                            <dd>{formatDate(box.created_at)}</dd>
                                        </div>
                                    </dl>
                                </div>
                            )}

                            {/* TAB 3: HISTORY */}
                            {activeTab === "history" && (
                                <div className="pane-history-wrapper">
                                    <BoxHistoryTimeline
                                        createdDate={box.created_at}
                                        creatorUsername={owner.username || "Stellage"}
                                        ownerUsername={owner.username ?? undefined}
                                        isSealed={isSealed}
                                        priceCoins={priceCoins}
                                    />
                                </div>
                            )}

                            {/* TAB 4: COMMENTS */}
                            {activeTab === "comments" && (
                                <div className="pane-comments-wrapper">
                                    <CommentSection instanceId={box.id} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox for Images & Videos */}
            {activeAsset && activeAsset.kind === "video" && (
                <StellageVideoLightbox
                    assetId={activeAsset.id}
                    title={activeAsset.original_name}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
            {activeAsset && activeAsset.kind === "photo" && (
                <StellageImageLightbox
                    assetId={activeAsset.id}
                    originalName={activeAsset.original_name}
                    mime={activeAsset.mime ?? undefined}
                    sizeBytes={activeAsset.size_bytes}
                    createdAt={typeof activeAsset.created_at === "string" ? activeAsset.created_at : activeAsset.created_at ? String(activeAsset.created_at) : undefined}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </div>
    );
};
