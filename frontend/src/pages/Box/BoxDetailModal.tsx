import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
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
 * Модалка просмотра коробки на полке: показывает визуал, метаданные шаблона и
 * содержимое (content — временный JSON-плейсхолдер до переезда на S3).
 */
export const BoxDetailModal = ({ box, onClose }: BoxDetailModalProps) => {
    useEffect(() => {
        if (!box) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [box, onClose]);

    if (!box) return null;

    const { template } = box;
    const key = rarityKey(template.rarity);
    const { rarityGlow: glow, boxColor } = resolveRarityVisual(template.rarity ?? "common");
    const contentEntries = Object.entries(box.content ?? {});

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
                    <WireframeBox size={150} rarityGlow={glow} color={boxColor} />
                </div>

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
                            <dd>#{box.serial_number}</dd>
                        </div>
                        <div className="box-modal-meta-row">
                            <dt>Статус</dt>
                            <dd>{SEALED_LABEL[box.is_sealed]} · {VISIBILITY_LABEL[box.is_public]}</dd>
                        </div>
                        <div className="box-modal-meta-row">
                            <dt>Добавлена</dt>
                            <dd>{formatDate(box.created_at)}</dd>
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
                </div>
            </div>
        </div>,
        document.body
    );
};
