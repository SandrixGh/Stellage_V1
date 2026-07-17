import { useState } from "react";
import { createPortal } from "react-dom";
import { InventoryPickerModal } from "../../components/Stellage/InventoryPickerModal";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import type { Box } from "../../types/Stellage/boxes";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import "./GiftPickerModal.css";

interface GiftPickerModalProps {
    /** Все коробки текущего пользователя (инвентарь + то, что стоит на полках). */
    boxes: Box[];
    peerName: string;
    onSend: (instanceId: string, caption: string) => Promise<void>;
    onClose: () => void;
}

/**
 * Дарение коробки прямо из чата, без перехода на /inventory: шаг 1 — выбор
 * коробки (переиспользуем InventoryPickerModal), шаг 2 — необязательная подпись
 * и подтверждение отправки.
 */
export const GiftPickerModal = ({ boxes, peerName, onSend, onClose }: GiftPickerModalProps) => {
    const [picked, setPicked] = useState<Box | null>(null);
    const [caption, setCaption] = useState("");
    const [sending, setSending] = useState(false);
    useBodyScrollLock();

    if (!picked) {
        return (
            <InventoryPickerModal
                boxes={boxes}
                title="Подарить коробку"
                hint={`Выбери коробку из инвентаря, чтобы подарить её ${peerName}.`}
                onPick={(instanceId) => {
                    const box = boxes.find((b) => b.id === instanceId) ?? null;
                    setPicked(box);
                }}
                onClose={onClose}
            />
        );
    }

    const { rarityGlow, boxColor } = resolveRarityVisual(picked.template.rarity ?? "common");

    const handleConfirm = async () => {
        setSending(true);
        try {
            await onSend(picked.id, caption);
        } finally {
            setSending(false);
        }
    };

    return createPortal(
        <div className="gift-confirm-overlay" onClick={onClose}>
            <div className="gift-confirm" onClick={(e) => e.stopPropagation()}>
                <div className="gift-confirm-head">
                    <h2 className="gift-confirm-title">Подарить коробку</h2>
                    <button type="button" className="gift-confirm-close" aria-label="Закрыть" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="gift-confirm-preview">
                    <WireframeBox
                        size={72}
                        rarityGlow={rarityGlow}
                        color={boxColor}
                        contentType={resolveBoxContentType(picked)}
                    />
                    <div className="gift-confirm-info">
                        <span className="gift-confirm-box-title">«{picked.template.title}»</span>
                        <span className="gift-confirm-to">получит {peerName}</span>
                    </div>
                    <button
                        type="button"
                        className="gift-confirm-change"
                        onClick={() => setPicked(null)}
                        disabled={sending}
                    >
                        Выбрать другую
                    </button>
                </div>

                <textarea
                    className="gift-confirm-caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Добавьте сообщение к подарку (необязательно)…"
                    rows={2}
                    maxLength={4000}
                    disabled={sending}
                />

                <div className="gift-confirm-actions">
                    <button type="button" className="gift-confirm-cancel" onClick={onClose} disabled={sending}>
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="gift-confirm-send"
                        onClick={handleConfirm}
                        disabled={sending}
                    >
                        {sending ? "Дарим…" : "Подарить"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
