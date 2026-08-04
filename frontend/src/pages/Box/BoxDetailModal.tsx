import { useEffect, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { AssetViewer } from "../../components/Stellage/AssetViewer";
import { StellageVideoLightbox } from "../../components/Stellage/StellageVideoPlayer";
import { StellageImageLightbox } from "../../components/Stellage/StellageImageLightbox";
import { BoxHistoryTimeline, type BoxHistoryEvent } from "../../components/Stellage/BoxHistoryTimeline";
import { CommentSection } from "../../components/Stellage/CommentSection";
import { SmartContentInspector } from "../../components/Stellage/SmartContentInspector";
import {
    BoxIcon,
    SpecsIcon,
    HistoryIcon,
    CommentsIcon,
    LockIcon,
    EyeIcon,
    UnsealIcon,
} from "../../components/UI/Icons";
import { LikeButton } from "../../components/UI/LikeButton";
import { StellaCoinIcon } from "../../components/UI/StellaCoinIcon";
import { UserPicker } from "../../components/UI/UserPicker";
import type { PublicUser } from "../../types/Profile/profile";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { rarityKey } from "../../utils/rarity";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import {
    MAX_BYTES,
    deleteAsset,
    formatBytes,
    kindForMime,
    uploadBoxAsset,
    uploadErrorMessage,
} from "../../api/assets";
import "./BoxDetailModal.css";

interface BoxDetailModalProps {
    box: Box | null;
    onClose: () => void;
}

const SEALED_LABEL: Record<Box["is_sealed"], string> = {
    sealed: "Запечатана",
    "not sealed": "Распечатана",
};

const VISIBILITY_LABEL: Record<Box["is_public"], string> = {
    public: "Публичная",
    private: "Приватная",
};

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

export const BoxDetailModal = ({ box, onClose }: BoxDetailModalProps) => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const isSuperuser = useAuthStore((s) => s.user?.is_superuser ?? false);

    const updateBox = useStellageStore((s) => s.updateBox);
    const giftBox = useStellageStore((s) => s.giftBox);
    const unsealBox = useStellageStore((s) => s.unsealBox);
    const refreshBox = useStellageStore((s) => s.refreshBox);
    const moveBox = useStellageStore((s) => s.moveBox);
    const deleteBox = useStellageStore((s) => s.deleteBox);

    const [current, setCurrent] = useState<Box | null>(box);
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [activeTab, setActiveTab] = useState<"content" | "specs" | "history" | "comments">("content");
    const [busy, setBusy] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [unsealing, setUnsealing] = useState(false);

    // Gift drawer state
    const [giftOpen, setGiftOpen] = useState(false);
    const [giftRecipient, setGiftRecipient] = useState<PublicUser | null>(null);
    const [giftError, setGiftError] = useState<string | null>(null);

    // Edit form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0");
    const [rarity, setRarity] = useState("common");
    const [contentText, setContentText] = useState("");
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [assetError, setAssetError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [historyEvents, setHistoryEvents] = useState<BoxHistoryEvent[]>([]);

    useBodyScrollLock(!!current);

    useEffect(() => {
        setCurrent(box);
        setMode("view");
        setActiveTab("content");
        setLightboxIndex(null);
        setUnsealing(false);
        setGiftOpen(false);
        setGiftRecipient(null);
        setGiftError(null);
    }, [box]);

    useEffect(() => {
        if (!current) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && lightboxIndex === null) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [current, onClose, lightboxIndex]);

    if (!current || !current.template) return null;

    const { template } = current;
    const key = rarityKey(template.rarity);
    const { rarityGlow: glow, boxColor } = resolveRarityVisual(template.rarity ?? "common");
    const contentTextValue = typeof current.content?.text === "string" ? current.content.text : "";
    const assets = current.assets ?? [];

    const isOwner = !!user && current.user_id === user.id;
    const isCreator = !!user && !!template.creator_id && template.creator_id === user.id;
    const canEdit = isCreator;
    const onShelf = current.shelf_id !== null;
    const isSealed = current.is_sealed === "sealed";
    const canViewContent = !isSealed || isOwner || isCreator;
    const priceCoins = Math.round(Number(template.price) || 0);

    const goToDetail = () => {
        onClose();
        navigate(`/box/instance/${current.id}`);
    };

    const startEdit = () => {
        setTitle(template.title);
        setDescription(template.description ?? "");
        setPrice(String(Math.round(Number(template.price) || 0)));
        setRarity((template.rarity ?? "common").toLowerCase());
        setContentText(contentTextValue);
        setMode("edit");
    };

    const handleSave = async () => {
        const trimmed = title.trim();
        if (trimmed.length < 1 || busy) return;
        setBusy(true);
        setSaveSuccess(null);
        const text = contentText.trim();
        const updated = await updateBox(current.id, {
            title: trimmed,
            description: description.trim() || null,
            price: Math.max(0, Math.floor(Number(price) || 0)),
            currency: "stella",
            rarity: isSuperuser ? rarity : undefined,
            content: text ? { text } : null,
        });
        setBusy(false);
        if (updated) {
            setCurrent(updated);
            setSaveSuccess("Изменения успешно сохранены!");
            setTimeout(() => setSaveSuccess(null), 4000);
            setMode("view");
            const editEvent: BoxHistoryEvent = {
                id: `edit-${Date.now()}`,
                eventType: "UPDATED",
                actorName: user?.username || template.owner_username || "Автор",
                timestamp: new Date().toISOString(),
                details: "Содержимое и параметры коробки изменены автором",
            };
            setHistoryEvents((prev) => [editEvent, ...prev]);
        }
    };

    const handleUnseal = async () => {
        if (busy || unsealing) return;
        setUnsealing(true);
        const fresh = await unsealBox(current.id);
        if (fresh) setCurrent(fresh);
        setTimeout(() => setUnsealing(false), 500);
    };

    const handleRemoveFromShelf = async () => {
        if (busy) return;
        setBusy(true);
        await moveBox(current.id, null);
        setBusy(false);
        onClose();
    };

    const handleDelete = async () => {
        if (busy) return;
        const ok = window.confirm(
            `Удалить коробку «${template.title}» безвозвратно? Это действие нельзя отменить.`
        );
        if (!ok) return;
        setBusy(true);
        await deleteBox(current.id);
        setBusy(false);
        onClose();
    };

    const handleGift = async () => {
        const uname = giftRecipient?.username;
        if (!uname || busy) return;
        setBusy(true);
        setGiftError(null);
        const ok = await giftBox(current.id, uname);
        setBusy(false);
        if (ok) {
            onClose();
        } else {
            setGiftError("Не удалось подарить: попробуйте выбрать получателя заново.");
        }
    };

    const syncCurrent = async () => {
        const fresh = await refreshBox(current.id);
        if (fresh) setCurrent(fresh);
    };

    const handleAddAsset = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || busy || uploadProgress !== null) return;

        // Если это файл кода / текста / markdown / LaTeX — считываем его содержимое в редактор контента
        if (
            file.type.startsWith("text/") ||
            file.type.includes("latex") ||
            file.type.includes("tex") ||
            /\.(py|js|ts|tsx|jsx|cpp|c|h|cs|java|json|md|txt|html|css|latex|tex|sql|sh|yaml|yml)$/i.test(file.name)
        ) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                if (text) {
                    setContentText((prev) => (prev ? prev + "\n\n" + text : text));
                    setAssetError(null);
                    setSaveSuccess(`Текст файла «${file.name}» успешно добавлен в редактор!`);
                    setTimeout(() => setSaveSuccess(null), 4000);
                }
            };
            reader.readAsText(file);
            return;
        }

        const kind = kindForMime(file.type);
        if (!kind) {
            setAssetError("Неподдерживаемый тип файла");
            return;
        }
        if (file.size > MAX_BYTES[kind]) {
            setAssetError(`Файл больше лимита ${formatBytes(MAX_BYTES[kind])}`);
            return;
        }

        setAssetError(null);
        setUploadProgress(0);
        try {
            await uploadBoxAsset(current.id, file, (fraction) => setUploadProgress(Math.round(fraction * 100)));
            await syncCurrent();
        } catch (err) {
            setAssetError(uploadErrorMessage(err));
        }
        setUploadProgress(null);
    };

    const handleDeleteAsset = async (assetId: string) => {
        if (busy || uploadProgress !== null) return;
        setAssetError(null);
        try {
            await deleteAsset(assetId);
            await syncCurrent();
        } catch {
            setAssetError("Не удалось удалить файл");
        }
    };

    const activeAsset = lightboxIndex !== null ? assets[lightboxIndex] : null;

    return createPortal(
        <>
            <div className="box-modal-overlay" onClick={onClose}>
                <div className="box-modal" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        className="box-modal-close"
                        aria-label="Закрыть"
                        onClick={onClose}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {/* Top Visual Wireframe & Rarity Glow */}
                    <div
                        className={`box-modal-visual${unsealing ? " is-unsealing" : ""}${
                            isSealed && !unsealing ? " is-sealed" : ""
                        }`}
                    >
                        <WireframeBox
                            size={180}
                            rarityGlow={glow}
                            color={boxColor}
                            contentType={resolveBoxContentType(current)}
                            variant="2.5d-slot"
                            coverUrl={(current as any).cover_url || (current as any).preview_url || null}
                        />
                    </div>

                    {mode === "view" ? (
                        <div className="box-modal-body">
                            {saveSuccess && (
                                <div className="box-modal-save-success">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>{saveSuccess}</span>
                                </div>
                            )}
                            {/* Title & Price Header */}
                            <div className="box-modal-head">
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                    <h2 className="box-modal-title">{template.title}</h2>
                                    <LikeButton
                                        instanceId={current.id}
                                        initialLikesCount={current.likes_count ?? 0}
                                        initialIsLiked={current.is_liked ?? false}
                                    />
                                </div>
                                <div className="box-modal-price-badge">
                                    <StellaCoinIcon size={18} />
                                    <span>{priceCoins}</span>
                                </div>
                            </div>

                            <div className="box-modal-subhead">
                                <span className={`box-modal-rarity rarity-tag-${key}`} style={{ color: boxColor }}>
                                    {template.rarity || "COMMON"}
                                </span>
                                <span className="dot">•</span>
                                <span className="box-serial">#{current.serial_number}</span>
                                <span className="dot">•</span>
                                <span className="box-seal-status">{SEALED_LABEL[current.is_sealed]}</span>
                            </div>

                            {template.description && (
                                <p className="box-modal-desc">{template.description}</p>
                            )}

                            {/* Main Navigation Tabs */}
                            <div className="box-modal-tabs">
                                <button
                                    className={`box-modal-tab ${activeTab === "content" ? "active" : ""}`}
                                    onClick={() => setActiveTab("content")}
                                >
                                    <BoxIcon size={16} />
                                    <span>Содержимое</span>
                                </button>
                                <button
                                    className={`box-modal-tab ${activeTab === "specs" ? "active" : ""}`}
                                    onClick={() => setActiveTab("specs")}
                                >
                                    <SpecsIcon size={16} />
                                    <span>Информация</span>
                                </button>
                                <button
                                    className={`box-modal-tab ${activeTab === "history" ? "active" : ""}`}
                                    onClick={() => setActiveTab("history")}
                                >
                                    <HistoryIcon size={16} />
                                    <span>История</span>
                                </button>
                                <button
                                    className={`box-modal-tab ${activeTab === "comments" ? "active" : ""}`}
                                    onClick={() => setActiveTab("comments")}
                                >
                                    <CommentsIcon size={16} />
                                    <span>Комментарии</span>
                                </button>
                            </div>

                            {/* TAB 1: CONTENT */}
                            {activeTab === "content" && (
                                <div className="box-modal-tab-pane">
                                    {!canViewContent ? (
                                        <div className="sealed-secret-card">
                                            <LockIcon size={32} />
                                            <h4>Запечатанный модуль</h4>
                                            <p>
                                                Содержимое скрыто автором @{template.owner_username || "Stellage"}.
                                                Заглянуть внутрь сможет только покупатель после распаковки.
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

                                            {isOwner && isSealed && (
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

                                            {/* Text & Code Content */}
                                            {contentTextValue && (
                                                <SmartContentInspector content={contentTextValue} boxTitle={template.title} />
                                            )}

                                            {/* Media Assets */}
                                            {assets.length > 0 && (
                                                <div className="box-modal-assets-grid">
                                                    {assets.map((asset) => (
                                                        <div key={asset.id} className="box-modal-asset-item">
                                                            <button
                                                                type="button"
                                                                className="box-modal-thumb-btn"
                                                                onClick={() => setLightboxIndex(assets.indexOf(asset))}
                                                            >
                                                                <AssetViewer asset={asset} thumb />
                                                                <span className="asset-name-label">{asset.original_name}</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {!contentTextValue && assets.length === 0 && (
                                                <p className="box-modal-content-empty">
                                                    {isOwner
                                                        ? "Коробка пока пуста."
                                                        : "Содержимое скрыто или коробка пуста."}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: SPECS */}
                            {activeTab === "specs" && (
                                <div className="box-modal-tab-pane">
                                    <dl className="box-modal-meta">
                                        <div className="box-modal-meta-row">
                                            <dt>Стоимость</dt>
                                            <dd className="price-dd">
                                                <StellaCoinIcon size={16} />
                                                <span>{priceCoins} StellaCoins</span>
                                            </dd>
                                        </div>
                                        <div className="box-modal-meta-row">
                                            <dt>Серийный экземпляр</dt>
                                            <dd>#{current.serial_number}</dd>
                                        </div>
                                        <div className="box-modal-meta-row">
                                            <dt>Статус герметичности</dt>
                                            <dd>{SEALED_LABEL[current.is_sealed]}</dd>
                                        </div>
                                        <div className="box-modal-meta-row">
                                            <dt>Доступность</dt>
                                            <dd>{VISIBILITY_LABEL[current.is_public]}</dd>
                                        </div>
                                        <div className="box-modal-meta-row">
                                            <dt>Автор / Создатель</dt>
                                            <dd>@{template.owner_username || "Stellage"}</dd>
                                        </div>
                                        <div className="box-modal-meta-row">
                                            <dt>Дата минта</dt>
                                            <dd>{formatDate(current.created_at)}</dd>
                                        </div>
                                    </dl>
                                </div>
                            )}

                            {/* TAB 3: HISTORY */}
                            {activeTab === "history" && (
                                <div className="box-modal-tab-pane">
                                    <BoxHistoryTimeline
                                        createdDate={current.created_at}
                                        creatorUsername={template.owner_username || "Stellage"}
                                        ownerUsername={template.owner_username ?? undefined}
                                        isSealed={isSealed}
                                        priceCoins={priceCoins}
                                        events={historyEvents}
                                    />
                                </div>
                            )}

                            {/* TAB 4: COMMENTS */}
                            {activeTab === "comments" && (
                                <div className="box-modal-tab-pane">
                                    <CommentSection instanceId={current.id} />
                                </div>
                            )}

                            {/* Footer Actions Bar */}
                            <div className="box-modal-footer">
                                <div className="box-modal-footer-btns">
                                    <button
                                        type="button"
                                        className="box-modal-btn primary"
                                        onClick={goToDetail}
                                    >
                                        Открыть дашборд →
                                    </button>

                                    {isOwner && (
                                        <>
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    className="box-modal-btn secondary"
                                                    onClick={startEdit}
                                                    disabled={busy}
                                                >
                                                    Изменить
                                                </button>
                                            )}
                                            {onShelf && (
                                                <button
                                                    type="button"
                                                    className="box-modal-btn secondary"
                                                    onClick={handleRemoveFromShelf}
                                                    disabled={busy}
                                                >
                                                    Снять
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="box-modal-btn secondary"
                                                onClick={() => setGiftOpen((v) => !v)}
                                                disabled={busy}
                                            >
                                                Подарить
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Gift Dialog Drawer */}
                            {isOwner && giftOpen && (
                                <div className="box-modal-gift">
                                    <h4 className="box-modal-gift-title">Кому передать коробку?</h4>
                                    <UserPicker
                                        value={giftRecipient}
                                        onSelect={setGiftRecipient}
                                        placeholder="Найти пользователя по логину…"
                                    />
                                    {giftError && <p className="box-modal-asset-error">{giftError}</p>}
                                    <div className="box-modal-gift-actions">
                                        <button
                                            type="button"
                                            className="box-modal-btn primary"
                                            onClick={handleGift}
                                            disabled={busy || !giftRecipient}
                                        >
                                            Подарить сейчас
                                        </button>
                                        <button
                                            type="button"
                                            className="box-modal-btn ghost"
                                            onClick={() => setGiftOpen(false)}
                                            disabled={busy}
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* EDIT MODE */
                        <form
                            className="box-modal-edit"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSave();
                            }}
                        >
                            <h3 className="box-modal-edit-title">Редактирование параметров</h3>

                            <label className="box-modal-field">
                                <span>Название</span>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    maxLength={100}
                                    required
                                />
                            </label>

                            <label className="box-modal-field">
                                <span>Описание</span>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    maxLength={100}
                                    rows={2}
                                />
                            </label>

                            <label className="box-modal-field">
                                <span>Цена в StellaCoins</span>
                                <div className="create-box-price-input-wrap">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                                        placeholder="0"
                                    />
                                    <span className="price-coin-suffix">
                                        <StellaCoinIcon size={18} />
                                    </span>
                                </div>
                            </label>

                            <label className="box-modal-field">
                                <span>Код / Markdown / LaTeX / Текст внутри коробки</span>
                                <textarea
                                    value={contentText}
                                    onChange={(e) => setContentText(e.target.value)}
                                    placeholder="Введите или вставьте Python код, Markdown, LaTeX формулы ($$\frac{a}{b}$$) или текст..."
                                    rows={6}
                                />
                            </label>

                            {/* Asset Management */}
                            <div className="box-modal-field">
                                <span>Файлы и медиа-содержимое</span>
                                {assets.length > 0 && (
                                    <ul className="box-modal-assets-list">
                                        {assets.map((asset) => (
                                            <li key={asset.id} className="box-modal-asset-row">
                                                <span className="box-modal-asset-name">{asset.original_name}</span>
                                                <button
                                                    type="button"
                                                    className="box-modal-asset-del"
                                                    onClick={() => handleDeleteAsset(asset.id)}
                                                    disabled={busy || uploadProgress !== null}
                                                >
                                                    Удалить
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {assets.length < 5 && (
                                    <label className="box-modal-upload-btn">
                                        <span>+ Загрузить картинку, видео или файл кода (.py/.md/.txt)</span>
                                        <input
                                            type="file"
                                            accept="image/*,video/*,.py,.js,.ts,.tsx,.jsx,.cpp,.c,.h,.cs,.java,.json,.md,.txt,.html,.css,.latex,.tex,.sql,.sh,.yaml,.yml"
                                            onChange={handleAddAsset}
                                            disabled={busy || uploadProgress !== null}
                                        />
                                    </label>
                                )}
                                {uploadProgress !== null && (
                                    <div className="box-modal-progress">
                                        Загрузка… {uploadProgress}%
                                    </div>
                                )}
                                {assetError && <div className="box-modal-asset-error">{assetError}</div>}
                            </div>

                            <div className="box-modal-edit-actions">
                                <button type="submit" className="box-modal-btn primary" disabled={busy}>
                                    Сохранить
                                </button>
                                <button
                                    type="button"
                                    className="box-modal-btn secondary"
                                    onClick={() => setMode("view")}
                                    disabled={busy}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    className="box-modal-btn danger"
                                    onClick={handleDelete}
                                    disabled={busy}
                                >
                                    Удалить коробку
                                </button>
                            </div>
                        </form>
                    )}
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
        </>
    , document.body);
};
