import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getBoxView, type BoxPublicView } from "../../api/boxes";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ContentGrid } from "../../components/Stellage/ContentGrid";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import { rarityKey } from "../../utils/rarity";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import "./GiftBoxModal.css";

interface GiftBoxModalProps {
    instanceId: string;
    onClose: () => void;
}

/**
 * Просмотр подаренной коробки прямо из чата, без ухода на отдельную страницу.
 * Read-only: визуал коробки, метаданные шаблона и содержимое (сетка контента с
 * крупным просмотром). Видимость решает бэкенд (getBoxView): получатель видит
 * свою всегда, посторонний — только публичную на публичной полке, иначе «скрыта».
 */
export const GiftBoxModal = ({ instanceId, onClose }: GiftBoxModalProps) => {
    const navigate = useNavigate();
    const [view, setView] = useState<BoxPublicView | null>(null);
    const [loading, setLoading] = useState(true);
    const [hidden, setHidden] = useState(false);
    useBodyScrollLock();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setHidden(false);
        getBoxView(instanceId)
            .then((v) => !cancelled && setView(v))
            .catch(() => !cancelled && setHidden(true))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [instanceId]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const box = view?.box;
    const template = box?.template;
    const { rarityGlow, boxColor } = resolveRarityVisual(template?.rarity ?? "common");
    const contentText = typeof box?.content?.text === "string" ? box.content.text : "";
    const assets = box?.assets ?? [];

    return createPortal(
        <div className="giftbox-overlay" onClick={onClose}>
            <div className="giftbox" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="giftbox-close" aria-label="Закрыть" onClick={onClose}>
                    ✕
                </button>

                {loading ? (
                    <div className="giftbox-state">Загрузка коробки…</div>
                ) : hidden || !box || !template ? (
                    <div className="giftbox-state">Коробка скрыта или больше недоступна.</div>
                ) : (
                    <div className="giftbox-scroll">
                        <div className="giftbox-visual">
                            <WireframeBox
                                size={160}
                                rarityGlow={rarityGlow}
                                color={boxColor}
                                contentType={resolveBoxContentType(box)}
                                variant="2.5d-slot"
                                coverUrl={(box as any).cover_url || (box as any).preview_url || null}
                            />
                        </div>

                        <div className="giftbox-head">
                            <h2 className="giftbox-title">{template.title}</h2>
                            <span
                                className={`giftbox-rarity rarity-tag-${rarityKey(template.rarity)}`}
                                style={{ color: boxColor }}
                            >
                                {template.rarity}
                            </span>
                        </div>

                        {template.description && (
                            <p className="giftbox-desc">{template.description}</p>
                        )}

                        <div className="giftbox-content">
                            {contentText && <p className="giftbox-content-text">{contentText}</p>}
                            {assets.length > 0 && <ContentGrid assets={assets} dense />}
                            {!contentText && assets.length === 0 && (
                                <p className="giftbox-content-empty">Коробка пуста.</p>
                            )}
                        </div>

                        <button
                            type="button"
                            className="giftbox-open"
                            onClick={() => {
                                onClose();
                                navigate(`/box/instance/${instanceId}`);
                            }}
                        >
                            Открыть на странице коробки
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};
