import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../UI/Avatar";
import { WireframeBox } from "../Stellage/WireframeBox";
import { StellaCoinIcon } from "../UI/StellaCoinIcon";
import { resolveRarityVisual } from "../../data/mockTemplates";
import { type GiftItem, toggleGiftVisibility } from "../../api/profile";
import { useAuthStore } from "../../store/useAuthStore";
import "./GiftsGrid.css";

interface GiftsGridProps {
    gifts: GiftItem[];
    isOwner?: boolean;
    onGiftVisibilityChanged?: (instanceId: string, isPublic: boolean) => void;
}

export const GiftsGrid = ({ gifts, isOwner = false, onGiftVisibilityChanged }: GiftsGridProps) => {
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const myUsername = useAuthStore((s) => s.user?.username);

    const handleToggleVisibility = async (gift: GiftItem) => {
        setUpdatingId(gift.id);
        const newVisibility = !gift.is_gift_public;
        try {
            await toggleGiftVisibility(gift.id, newVisibility);
            if (onGiftVisibilityChanged) {
                onGiftVisibilityChanged(gift.id, newVisibility);
            }
        } finally {
            setUpdatingId(null);
        }
    };

    if (gifts.length === 0) {
        return (
            <div className="gifts-empty-state">
                <div className="gifts-empty-visual">
                    <WireframeBox size={140} color="#4FA98E" />
                </div>
                <h3 className="gifts-empty-title">Подарков пока нет</h3>
                <p className="gifts-empty-sub">
                    Здесь будут отображаться коробки и подарки, полученные от друзей и пользователей Stellage
                </p>
            </div>
        );
    }

    const getSenderLink = (username?: string | null) => {
        if (!username) return null;
        if (myUsername && myUsername === username) return "/profile";
        return `/u/${username}`;
    };

    return (
        <div className="gifts-grid-container">
            <div className="gifts-grid">
                {gifts.map((gift) => {
                    const senderName = gift.sender?.nickname?.trim() || (gift.sender?.username ? `@${gift.sender.username}` : "Аноним");
                    const senderTarget = getSenderLink(gift.sender?.username);

                    if (gift.gift_type === "coins" || gift.coins_amount) {
                        return (
                            <div key={gift.id} className="gift-card gift-coin-card rarity-golden">
                                {gift.sender && (
                                    senderTarget ? (
                                        <Link
                                            to={senderTarget}
                                            className="gift-sender-badge"
                                            title={`Отправитель: ${senderName}`}
                                        >
                                            <Avatar url={gift.sender.avatar_url} name={senderName} size={28} />
                                        </Link>
                                    ) : (
                                        <div className="gift-sender-badge anonymous" title={`Отправитель: ${senderName}`}>
                                            <Avatar url={gift.sender.avatar_url} name={senderName} size={28} />
                                        </div>
                                    )
                                )}
                                <div className="gift-visual-wrap gift-coin-visual">
                                    <StellaCoinIcon size={64} />
                                </div>
                                <div className="gift-details">
                                    <span className="gift-title">+{gift.coins_amount ?? 0} Stellacoin</span>
                                    <div className="gift-meta-row">
                                        <span className="gift-rarity-pill rarity-golden">МОНЕТЫ</span>
                                    </div>
                                    <span className="gift-from-line">
                                        От{" "}
                                        {senderTarget ? (
                                            <Link to={senderTarget} className="gift-from-name-link">
                                                {senderName}
                                            </Link>
                                        ) : (
                                            <span className="gift-from-name">{senderName}</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    const rarityClass = (gift.template_rarity || "common").toLowerCase();
                    const { rarityGlow, boxColor } = resolveRarityVisual(gift.template_rarity || "common");

                    return (
                        <div
                            key={gift.id}
                            className={`gift-card rarity-${rarityClass}${!gift.is_gift_public ? " gift-hidden" : ""}`}
                        >
                            {/* ТЕЛЕГРАМ-СТИЛЬ: АВАТАР ОТПРАВИТЕЛЯ В УГЛУ */}
                            {gift.sender && (
                                senderTarget ? (
                                    <Link
                                        to={senderTarget}
                                        className="gift-sender-badge"
                                        title={`Отправитель: ${senderName}`}
                                    >
                                        <Avatar
                                            url={gift.sender.avatar_url}
                                            name={senderName}
                                            size={28}
                                            className="gift-sender-avatar"
                                        />
                                    </Link>
                                ) : (
                                    <div className="gift-sender-badge anonymous" title={`Отправитель: ${senderName}`}>
                                        <Avatar
                                            url={gift.sender.avatar_url}
                                            name={senderName}
                                            size={28}
                                            className="gift-sender-avatar"
                                        />
                                    </div>
                                )
                            )}

                            {/* ЦЕНТРАЛЬНАЯ 3D-ГРАФИКА ПОДАРКА С ЦВЕТОМ РЕДКОСТИ */}
                            <div className="gift-visual-wrap">
                                <WireframeBox size={96} rarityGlow={rarityGlow} color={boxColor} />
                            </div>

                            {/* ИНФОРМАЦИЯ О ПОДАРКЕ */}
                            <div className="gift-details">
                                <span className="gift-title">{gift.template_title}</span>
                                <div className="gift-meta-row">
                                    <span className={`gift-rarity-pill rarity-${rarityClass}`}>
                                        {(gift.template_rarity || "COMMON").toUpperCase()}
                                    </span>
                                    <span className="gift-serial">#{String(gift.serial_number).padStart(3, "0")}</span>
                                </div>
                                <span className="gift-from-line">
                                    От{" "}
                                    {senderTarget ? (
                                        <Link to={senderTarget} className="gift-from-name-link">
                                            {senderName}
                                        </Link>
                                    ) : (
                                        <span className="gift-from-name">{senderName}</span>
                                    )}
                                </span>
                            </div>

                            {/* УПРАВЛЕНИЕ ВИДИМОСТЬЮ ДЛЯ ВЛАДЕЛЬЦА */}
                            {isOwner && (
                                <button
                                    type="button"
                                    className={`gift-visibility-toggle${!gift.is_gift_public ? " hidden" : ""}`}
                                    onClick={() => handleToggleVisibility(gift)}
                                    disabled={updatingId === gift.id}
                                    title={gift.is_gift_public ? "Скрыть из публичного профиля" : "Показать в профиле"}
                                >
                                    {gift.is_gift_public ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                            <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                            <line x1="2" x2="22" y1="2" y2="22" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
