import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { MessageItem } from "../../api/messages";
import "./MessageMediaLightbox.css";

interface Props {
    message: MessageItem;
    onClose: () => void;
}

/**
 * Полноэкранный просмотр вложения из сообщения. В отличие от лайтбокса коробок,
 * ссылка уже presigned и лежит в самом сообщении (asset_url) — заново её не
 * запрашиваем. Esc / клик по фону — закрыть.
 */
export const MessageMediaLightbox = ({ message, onClose }: Props) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (!message.asset_url) return null;

    return createPortal(
        <div className="msg-lightbox-overlay" onClick={onClose}>
            <button
                type="button"
                className="msg-lightbox-close"
                aria-label="Закрыть"
                onClick={onClose}
            >
                ✕
            </button>
            <div className="msg-lightbox-stage" onClick={(e) => e.stopPropagation()}>
                {message.asset_kind === "video" ? (
                    <video className="msg-lightbox-media" src={message.asset_url} controls autoPlay />
                ) : (
                    <img
                        className="msg-lightbox-media"
                        src={message.asset_url}
                        alt={message.asset_name ?? "Вложение"}
                    />
                )}
            </div>
        </div>,
        document.body,
    );
};
