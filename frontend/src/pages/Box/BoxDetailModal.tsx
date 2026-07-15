import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { Select } from "../../components/UI/Select";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { rarityKey } from "../../utils/rarity";
import { resolveRarityVisual } from "../../data/mockTemplates";
import "./BoxDetailModal.css";

interface BoxDetailModalProps {
    box: Box | null;
    onClose: () => void;
}

const SEALED_LABEL: Record<Box["is_sealed"], string> = {
    sealed: "Запечатана",
    unsealed: "Распечатана",
};

const VISIBILITY_LABEL: Record<Box["is_public"], string> = {
    public: "Публичная",
    private: "Приватная",
};

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
 * Модалка просмотра коробки на полке: визуал, метаданные шаблона и содержимое.
 * Владельцу коробки доступны действия — редактировать (только создателю),
 * снять с полки и удалить. content — временный JSON-плейсхолдер до переезда на S3.
 */
export const BoxDetailModal = ({ box, onClose }: BoxDetailModalProps) => {
    const user = useAuthStore((s) => s.user);
    const isSuperuser = useAuthStore((s) => s.user?.is_superuser ?? false);
    const updateBox = useStellageStore((s) => s.updateBox);
    const moveBox = useStellageStore((s) => s.moveBox);
    const deleteBox = useStellageStore((s) => s.deleteBox);

    // Локальная копия — чтобы после сохранения сразу показать обновлённую коробку,
    // не дожидаясь, пока родитель переоткроет модалку.
    const [current, setCurrent] = useState<Box | null>(box);
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [busy, setBusy] = useState(false);

    // Поля формы редактирования.
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0");
    const [currency, setCurrency] = useState("RUB");
    const [rarity, setRarity] = useState("common");
    const [contentText, setContentText] = useState("");

    // Синхронизируем локальную копию и сбрасываем режим при смене коробки.
    useEffect(() => {
        setCurrent(box);
        setMode("view");
    }, [box]);

    useEffect(() => {
        if (!current) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [current, onClose]);

    if (!current) return null;

    const { template } = current;
    const key = rarityKey(template.rarity);
    const { rarityGlow: glow, boxColor } = resolveRarityVisual(template.rarity ?? "common");
    const contentEntries = Object.entries(current.content ?? {});

    const isOwner = !!user && current.user_id === user.id;
    // Поля шаблона может править только создатель коробки (не покупатель каталожной).
    const canEdit = isOwner && !!template.creator_id && template.creator_id === user?.id;
    const onShelf = current.shelf_id !== null;

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

    return createPortal(
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

                <div className="box-modal-visual">
                    <WireframeBox size={150} rarityGlow={glow} color={boxColor} contentType={template.contentType} />
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
                                <dd>{SEALED_LABEL[current.is_sealed]} · {VISIBILITY_LABEL[current.is_public]}</dd>
                            </div>
                            <div className="box-modal-meta-row">
                                <dt>Добавлена</dt>
                                <dd>{formatDate(current.created_at)}</dd>
                            </div>
                        </dl>

                        <div className="box-modal-content">
                            <h3 className="box-modal-content-title">Содержимое</h3>
                            {contentEntries.length > 0 ? (
                                <dl className="box-modal-content-list">
                                    {contentEntries.map(([k, v]) => (
                                        <div key={k} className="box-modal-content-item">
                                            <dt>{k}</dt>
                                            <dd>{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            ) : (
                                <p className="box-modal-content-empty">
                                    Коробка пока пуста. Хранилище контента появится позже.
                                </p>
                            )}
                        </div>

                        {isOwner && (
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
                                    className="box-modal-btn danger"
                                    onClick={handleDelete}
                                    disabled={busy}
                                >
                                    Удалить
                                </button>
                            </div>
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
                            <span className="box-modal-label">Содержимое</span>
                            <textarea
                                className="box-modal-input box-modal-textarea"
                                value={contentText}
                                rows={4}
                                placeholder="Текст, ссылка или заметка"
                                onChange={(e) => setContentText(e.target.value)}
                            />
                        </label>

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
        </div>,
        document.body
    );
};
