import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import "./DeleteConfirmModal.css";

interface DeleteConfirmModalProps {
    onConfirm: () => void;
    onClose: () => void;
}

export const DeleteConfirmModal = ({ onConfirm, onClose }: DeleteConfirmModalProps) => {
    useBodyScrollLock();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return createPortal(
        <div className="msg-delete-overlay" onClick={onClose}>
            <div className="msg-delete-modal" onClick={(e) => e.stopPropagation()}>
                <div className="msg-delete-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h3 className="msg-delete-title">Удалить сообщение?</h3>
                <p className="msg-delete-text">Оно будет безвозвратно удалено у всех участников переписки.</p>
                <div className="msg-delete-actions">
                    <button type="button" className="msg-delete-cancel" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="msg-delete-confirm"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        Удалить
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
