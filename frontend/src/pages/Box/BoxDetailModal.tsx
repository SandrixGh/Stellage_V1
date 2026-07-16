import { useEffect, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { AssetViewer } from "../../components/Stellage/AssetViewer";
import { AssetLightbox } from "../../components/Stellage/AssetLightbox";
import { LikeButton } from "../../components/Stellage/LikeButton";
import { Select } from "../../components/UI/Select";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { rarityKey } from "../../utils/rarity";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import {
    ACCEPT_ATTR,
    MAX_ASSETS_PER_BOX,
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

/** Длиннее — текст не показываем в модалке целиком (обрезаем, полностью — в
 * детальном виде), чтобы быстрый просмотр оставался компактным. */
const TEXT_PREVIEW_LIMIT = 280;

const CURRENCIES = ["RUB", "USD", "EUR", "GBP", "CNY", "JPY", "KZT", "BYN", "TRY"];
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

const RARITY_OPTIONS = [
    { value: "common", label: "Common" },
    { value: "rare", label: "Rare" },
    { value: "golden", label: "Golden" },
    { value: "developer's", label: "Developer's" },
];

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

/**
 * Модалка просмотра коробки на полке: визуал, метаданные шаблона и содержимое
 * (текст + S3-ассеты через короткоживущие presigned-ссылки). Владельцу
 * доступны действия — редактировать (только создателю), снять с полки, удалить.
 */
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

    // Локальная копия — чтобы после сохранения сразу показать обновлённую коробку,
    // не дожидаясь, пока родитель переоткроет модалку.
    const [current, setCurrent] = useState<Box | null>(box);
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [busy, setBusy] = useState(false);
    // Индекс ассета, открытого в полноэкранном лайтбоксе (null — закрыт).
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    // Проигрывается разовая анимация вскрытия — контент раскрываем после неё.
    const [unsealing, setUnsealing] = useState(false);
    // Диалог дарения: открыт ли, введённый username получателя, ошибка.
    const [giftOpen, setGiftOpen] = useState(false);
    const [giftUsername, setGiftUsername] = useState("");
    const [giftError, setGiftError] = useState<string | null>(null);

    // Поля формы редактирования.
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0");
    const [currency, setCurrency] = useState("RUB");
    const [rarity, setRarity] = useState("common");
    const [contentText, setContentText] = useState("");

    // Загрузка/удаление ассетов (режим редактирования).
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [assetError, setAssetError] = useState<string | null>(null);

    // Синхронизируем локальную копию и сбрасываем режим при смене коробки.
    useEffect(() => {
        setCurrent(box);
        setMode("view");
        setLightboxIndex(null);
        setUnsealing(false);
        setGiftOpen(false);
        setGiftUsername("");
        setGiftError(null);
    }, [box]);

    useEffect(() => {
        if (!current) return;
        // Пока открыт лайтбокс, Esc гасит его (свой обработчик), а не модалку.
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && lightboxIndex === null) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [current, onClose, lightboxIndex]);

    if (!current) return null;

    const { template } = current;
    const key = rarityKey(template.rarity);
    const { rarityGlow: glow, boxColor } = resolveRarityVisual(template.rarity ?? "common");
    const contentTextValue =
        typeof current.content?.text === "string" ? current.content.text : "";
    const assets = current.assets ?? [];

    const isOwner = !!user && current.user_id === user.id;
    // Поля шаблона может править только создатель коробки (не покупатель каталожной).
    const canEdit = isOwner && !!template.creator_id && template.creator_id === user?.id;
    const onShelf = current.shelf_id !== null;
    // Запечатанность — коллекционный статус («не вскрыто»), а не замок на
    // контент: владелец видит содержимое всегда, распечатка — это ритуал/событие.
    const isSealed = current.is_sealed === "sealed";
    // Длинный текст в модалке не разворачиваем — читается в детальном виде.
    const longText = contentTextValue.length > TEXT_PREVIEW_LIMIT;

    // Уходим на детальную страницу экземпляра коробки (второй режим просмотра).
    const goToDetail = () => {
        onClose();
        navigate(`/box/instance/${current.id}`);
    };

    const startEdit = () => {
        setTitle(template.title);
        setDescription(template.description ?? "");
        setPrice(String(template.price ?? "0"));
        setCurrency((template.currency ?? "RUB").toUpperCase());
        setRarity((template.rarity ?? "common").toLowerCase());
        const text = current.content && typeof current.content.text === "string"
            ? current.content.text
            : "";
        setContentText(text);
        setMode("edit");
    };

    const handleSave = async () => {
        const trimmed = title.trim();
        if (trimmed.length < 1 || busy) return;
        setBusy(true);
        const text = contentText.trim();
        const updated = await updateBox(current.id, {
            title: trimmed,
            description: description.trim() || null,
            price: Number(price) || 0,
            currency,
            rarity: isSuperuser ? rarity : undefined,
            content: text ? { text } : null,
        });
        setBusy(false);
        if (updated) {
            setCurrent(updated);
            setMode("view");
        }
    };

    const handleUnseal = async () => {
        if (busy || unsealing) return;
        setUnsealing(true);
        // Применяем свежий снимок сразу, как только бэкенд подтвердил переход
        // (стор параллельно ресинхронизирует инвентарь и полку). Анимацию просто
        // снимаем по таймеру — состояние коробки за ней больше не «отстаёт».
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
        const uname = giftUsername.trim().replace(/^@/, "");
        if (!uname || busy) return;
        setBusy(true);
        setGiftError(null);
        const ok = await giftBox(current.id, uname);
        setBusy(false);
        if (ok) {
            onClose();
        } else {
            setGiftError("Не удалось подарить: проверьте username получателя.");
        }
    };

    const syncCurrent = async () => {
        const fresh = await refreshBox(current.id);
        if (fresh) setCurrent(fresh);
    };

    const handleAddAsset = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // позволяем выбрать тот же файл повторно
        if (!file || busy || uploadProgress !== null) return;

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
            await uploadBoxAsset(current.id, file, setUploadProgress);
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
                    ✕
                </button>

                <div
                    className={`box-modal-visual${unsealing ? " is-unsealing" : ""}${
                        isSealed && !unsealing ? " is-sealed" : ""
                    }`}
                >
                    <WireframeBox size={150} rarityGlow={glow} color={boxColor} contentType={resolveBoxContentType(current)} />
                </div>

                {mode === "view" ? (
                    <div className="box-modal-body">
                        <div className="box-modal-head">
                            <h2 className="box-modal-title">{template.title}</h2>
                            <span
                                className={`box-modal-rarity rarity-tag-${key}`}
                                style={{ color: boxColor }}
                            >
                                {template.rarity}
                            </span>
                        </div>

                        {template.description && (
                            <p className="box-modal-desc">{template.description}</p>
                        )}

                        <dl className="box-modal-meta">
                            <div className="box-modal-meta-row">
                                <dt>Цена</dt>
                                <dd>{template.price} {template.currency}</dd>
                            </div>
                            <div className="box-modal-meta-row">
                                <dt>Серийный номер</dt>
                                <dd>#{current.serial_number}</dd>
                            </div>
                            <div className="box-modal-meta-row">
                                <dt>Статус</dt>
                                <dd className="box-modal-status-dd">
                                    <span>
                                        {SEALED_LABEL[current.is_sealed]} · {VISIBILITY_LABEL[current.is_public]}
                                    </span>
                                    {isOwner && isSealed && (
                                        // Распечатывание — необратимое коллекционное
                                        // событие (как вскрыть Funko Pop/Lego).
                                        <button
                                            type="button"
                                            className="box-modal-unseal-inline"
                                            onClick={handleUnseal}
                                            disabled={busy || unsealing}
                                            title="Распечатать — коробка перестанет быть «запечатанной коллекционной». Действие необратимо."
                                        >
                                            {unsealing ? "Распечатываем…" : "Распечатать"}
                                        </button>
                                    )}
                                </dd>
                            </div>
                            <div className="box-modal-meta-row">
                                <dt>Добавлена</dt>
                                <dd>{formatDate(current.created_at)}</dd>
                            </div>
                        </dl>

                        <div className="box-modal-like">
                            <LikeButton instanceId={current.id} canLike={!!user} />
                        </div>

                        <div className="box-modal-content">
                            <h3 className="box-modal-content-title">Содержимое</h3>
                            {/* Запечатанность — коллекционное состояние («не вскрыто»),
                                а НЕ замок на контент: владелец видит содержимое всегда.
                                Быстрый просмотр показывает контент компактной сеткой
                                мелких превью; детально — на отдельной странице. */}
                            {longText ? (
                                <>
                                    <p className="box-modal-content-text is-clamped">
                                        {contentTextValue.slice(0, TEXT_PREVIEW_LIMIT)}…
                                    </p>
                                    <button
                                        type="button"
                                        className="box-modal-readmore"
                                        onClick={goToDetail}
                                    >
                                        Читать полностью в детальном виде
                                    </button>
                                </>
                            ) : (
                                contentTextValue && (
                                    <p className="box-modal-content-text">{contentTextValue}</p>
                                )
                            )}
                            {assets.length > 0 && (
                                <div className="box-modal-thumbs">
                                    {assets.map((asset, i) => (
                                        <button
                                            key={asset.id}
                                            type="button"
                                            className="box-modal-thumb"
                                            onClick={() => setLightboxIndex(i)}
                                            aria-label={`Открыть «${asset.original_name}»`}
                                        >
                                            <AssetViewer asset={asset} thumb />
                                            {asset.kind === "video" && (
                                                <span className="box-modal-thumb-play" aria-hidden="true">▶</span>
                                            )}
                                        </button>
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
                        </div>

                        <button
                            type="button"
                            className="box-modal-btn ghost box-modal-detail-btn"
                            onClick={goToDetail}
                        >
                            Посмотреть детальнее →
                        </button>

                        {isOwner && (
                            <>
                                <div className="box-modal-actions">
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="box-modal-btn ghost"
                                            onClick={startEdit}
                                            disabled={busy}
                                        >
                                            Редактировать
                                        </button>
                                    )}
                                    {onShelf && (
                                        <button
                                            type="button"
                                            className="box-modal-btn ghost"
                                            onClick={handleRemoveFromShelf}
                                            disabled={busy}
                                        >
                                            Снять с полки
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="box-modal-btn ghost"
                                        onClick={() => setGiftOpen((v) => !v)}
                                        disabled={busy}
                                    >
                                        Подарить
                                    </button>
                                    <button
                                        type="button"
                                        className="box-modal-btn danger"
                                        onClick={handleDelete}
                                        disabled={busy}
                                    >
                                        Удалить
                                    </button>
                                </div>

                                {giftOpen && (
                                    <div className="box-modal-gift">
                                        <p className="box-modal-gift-hint">
                                            Подарить коробку — она перейдёт к получателю и
                                            исчезнет из вашего инвентаря. Действие необратимо.
                                        </p>
                                        <div className="box-modal-gift-row">
                                            <input
                                                className="box-modal-input"
                                                type="text"
                                                value={giftUsername}
                                                placeholder="username получателя"
                                                maxLength={30}
                                                onChange={(e) => setGiftUsername(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleGift();
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="box-modal-btn primary"
                                                onClick={handleGift}
                                                disabled={busy || !giftUsername.trim()}
                                            >
                                                {busy ? "Дарим…" : "Подтвердить"}
                                            </button>
                                        </div>
                                        {giftError && (
                                            <span className="box-modal-asset-error">{giftError}</span>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="box-modal-body">
                        <h2 className="box-modal-edit-title">Редактирование коробки</h2>

                        <label className="box-modal-field">
                            <span className="box-modal-label">Название</span>
                            <input
                                className="box-modal-input"
                                type="text"
                                value={title}
                                maxLength={100}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                        </label>

                        <label className="box-modal-field">
                            <span className="box-modal-label">Описание</span>
                            <textarea
                                className="box-modal-input box-modal-textarea"
                                value={description}
                                maxLength={100}
                                rows={2}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </label>

                        <div className="box-modal-row">
                            <label className="box-modal-field">
                                <span className="box-modal-label">Цена</span>
                                <input
                                    className="box-modal-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </label>
                            <div className="box-modal-field">
                                <span className="box-modal-label">Валюта</span>
                                <Select
                                    value={currency}
                                    options={CURRENCY_OPTIONS}
                                    onChange={setCurrency}
                                    ariaLabel="Валюта"
                                />
                            </div>
                        </div>

                        {isSuperuser && (
                            <div className="box-modal-field">
                                <span className="box-modal-label">Редкость</span>
                                <Select
                                    value={rarity}
                                    options={RARITY_OPTIONS}
                                    onChange={setRarity}
                                    ariaLabel="Редкость"
                                />
                            </div>
                        )}

                        <label className="box-modal-field">
                            <span className="box-modal-label">Текст</span>
                            <textarea
                                className="box-modal-input box-modal-textarea"
                                value={contentText}
                                rows={4}
                                placeholder="Текст, ссылка или заметка"
                                onChange={(e) => setContentText(e.target.value)}
                            />
                        </label>

                        <div className="box-modal-field">
                            <span className="box-modal-label">Файлы</span>

                            {assets.length > 0 && (
                                <ul className="box-modal-asset-list">
                                    {assets.map((asset) => (
                                        <li key={asset.id} className="box-modal-asset-item">
                                            <span className="box-modal-asset-name" title={asset.original_name}>
                                                {asset.original_name}
                                            </span>
                                            <span className="box-modal-asset-size">
                                                {formatBytes(asset.size_bytes)}
                                            </span>
                                            <button
                                                type="button"
                                                className="box-modal-asset-remove"
                                                aria-label="Удалить файл"
                                                onClick={() => handleDeleteAsset(asset.id)}
                                                disabled={busy || uploadProgress !== null}
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {uploadProgress !== null ? (
                                <div className="box-modal-asset-progress">
                                    <div
                                        className="box-modal-asset-progress-fill"
                                        style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                                    />
                                </div>
                            ) : (
                                <label className="box-modal-asset-add">
                                    <input
                                        type="file"
                                        accept={ACCEPT_ATTR}
                                        hidden
                                        onChange={handleAddAsset}
                                        disabled={busy || assets.length >= MAX_ASSETS_PER_BOX}
                                    />
                                    + Добавить фото или видео
                                </label>
                            )}

                            {assetError && (
                                <span className="box-modal-asset-error">{assetError}</span>
                            )}
                        </div>

                        <div className="box-modal-actions">
                            <button
                                type="button"
                                className="box-modal-btn ghost"
                                onClick={() => setMode("view")}
                                disabled={busy}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="box-modal-btn primary"
                                onClick={handleSave}
                                disabled={busy || title.trim().length < 1}
                            >
                                {busy ? "Сохранение…" : "Сохранить"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {lightboxIndex !== null && assets.length > 0 && (
            <AssetLightbox
                assets={assets}
                startIndex={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
            />
        )}
        </>,
        document.body
    );
};
