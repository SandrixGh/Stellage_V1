import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { MessageItem } from "../../api/messages";
import type { PublicProfile } from "../../types/Profile/profile";
import { Avatar } from "../../components/UI/Avatar";
import { MiniShelf } from "../../components/Stellage/MiniShelf";
import { MessageMediaLightbox } from "./MessageMediaLightbox";
import { onlineStatus } from "../../utils/onlineStatus";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import "./PeerInfoPopover.css";

interface PeerInfoPopoverProps {
    username: string;
    peer: PublicProfile | null;
    peerName: string;
    messages: MessageItem[];
    onClose: () => void;
}

/**
 * Telegram-style быстрая карточка собеседника: открывается по клику на шапку
 * диалога вместо немедленного перехода в профиль. Показывает аватар/имя/статус,
 * СЕТКУ медиа из переписки (клик — крупный просмотр) и уменьшённый гомотетичный
 * стеллаж собеседника. Кнопка перехода в полный профиль. Медиа берём из уже
 * загруженных сообщений — отдельного эндпоинта «только вложения» на бэке нет.
 */
export const PeerInfoPopover = ({ username, peer, peerName, messages, onClose }: PeerInfoPopoverProps) => {
    const navigate = useNavigate();
    const [lightbox, setLightbox] = useState<MessageItem | null>(null);
    useBodyScrollLock();

    const media = useMemo(
        () => messages.filter((m) => m.asset_url && (m.asset_kind === "photo" || m.asset_kind === "video")),
        [messages],
    );

    const shelfBoxes = peer?.shelf?.boxes ?? [];

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && lightbox === null && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, lightbox]);

    return createPortal(
        <div className="peerinfo-overlay" onClick={onClose}>
            <div className="peerinfo" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="peerinfo-close" aria-label="Закрыть" onClick={onClose}>
                    ✕
                </button>

                <div className="peerinfo-scroll">
                    <div className="peerinfo-head">
                        <Avatar url={peer?.avatar_url} name={peerName} size={72} />
                        <span className="peerinfo-name">{peerName}</span>
                        {peer?.username && <span className="peerinfo-username">@{peer.username}</span>}
                        <span className="peerinfo-status">{onlineStatus(peer?.last_seen_at)}</span>
                        {peer?.bio && <p className="peerinfo-bio">{peer.bio}</p>}
                    </div>

                    {peer?.stats && (
                        <div className="peerinfo-stats">
                            <span>
                                <b>{peer.stats.boxes}</b> коробок
                            </span>
                            <span>
                                <b>{peer.stats.shelves}</b> полок
                            </span>
                        </div>
                    )}

                    {/* Уменьшённый стеллаж собеседника — «как это выглядит», без бирок. */}
                    {shelfBoxes.length > 0 && (
                        <div className="peerinfo-section">
                            <div className="peerinfo-section-head">Стеллаж</div>
                            <MiniShelf boxes={shelfBoxes} />
                        </div>
                    )}

                    {/* Сетка медиа из переписки — клик открывает крупный просмотр. */}
                    <div className="peerinfo-section">
                        <div className="peerinfo-section-head">Медиа из переписки</div>
                        {media.length === 0 ? (
                            <div className="peerinfo-media-empty">Пока нет фото и видео.</div>
                        ) : (
                            <div className="peerinfo-media-grid">
                                {media.map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        className="peerinfo-media-tile"
                                        onClick={() => setLightbox(m)}
                                        aria-label="Открыть медиа"
                                    >
                                        {m.asset_kind === "video" ? (
                                            <>
                                                <video src={m.asset_url!} muted preload="metadata" />
                                                <span className="peerinfo-media-play" aria-hidden="true">
                                                    ▶
                                                </span>
                                            </>
                                        ) : (
                                            <img src={m.asset_url!} alt={m.asset_name ?? "Фото"} loading="lazy" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    className="peerinfo-profile-btn"
                    onClick={() => {
                        onClose();
                        navigate(`/u/${username}`);
                    }}
                >
                    Открыть профиль
                </button>
            </div>

            {lightbox?.asset_url && (
                <MessageMediaLightbox message={lightbox} onClose={() => setLightbox(null)} />
            )}
        </div>,
        document.body,
    );
};
