import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "../UI/Avatar";
import { StellaCoinIcon } from "../UI/StellaCoinIcon";
import { giftStellaCoins } from "../../api/profile";
import { useAuthStore } from "../../store/useAuthStore";
import "./GiftCoinsModal.css";

interface GiftCoinsModalProps {
    recipientUsername: string;
    recipientNickname?: string | null;
    recipientAvatarUrl?: string | null;
    onClose: () => void;
    onSuccess?: () => void;
}

const PRESET_AMOUNTS = [10, 50, 100, 500];

export const GiftCoinsModal = ({
    recipientUsername,
    recipientNickname,
    recipientAvatarUrl,
    onClose,
    onSuccess,
}: GiftCoinsModalProps) => {
    const currentUser = useAuthStore((s) => s.user);
    const [amount, setAmount] = useState<string>("50");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    const displayName = recipientNickname?.trim() || `@${recipientUsername}`;
    const userBalance = currentUser?.stella_coins ?? 0;

    const handleSendGift = async () => {
        const numAmount = parseInt(amount, 10);
        if (isNaN(numAmount) || numAmount <= 0) {
            setErrorMsg("Введите корректную сумму Stellacoin");
            return;
        }

        if (numAmount > userBalance) {
            setErrorMsg(`Недостаточно Stellacoin. Ваш баланс: ${userBalance.toLocaleString("ru-RU")}`);
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            await giftStellaCoins(recipientUsername, numAmount);
            setIsSuccess(true);
            await useAuthStore.getState().getUser();
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setErrorMsg(typeof detail === "string" ? detail : "Не удалось отправить подарок");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="gift-modal-backdrop" onClick={onClose}>
            <div className="gift-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* КНОПКА ЗАКРЫТИЯ */}
                <button type="button" className="gift-modal-close" onClick={onClose}>
                    ✕
                </button>

                {!isSuccess ? (
                    <>
                        {/* ИКOНА И ЗАГОЛОВОК */}
                        <div className="gift-modal-header">
                            <div className="gift-coin-hero-visual">
                                <StellaCoinIcon size={44} />
                            </div>
                            <h2 className="gift-modal-title">Подарить Stellacoin</h2>
                            <p className="gift-modal-sub">
                                Переведите монетку пользователю в знак поддержки или подарка
                            </p>
                        </div>

                        {/* КАРТОЧКА ПОЛУЧАТЕЛЯ */}
                        <div className="gift-recipient-card">
                            <Avatar
                                url={recipientAvatarUrl}
                                name={displayName}
                                size={44}
                                className="gift-recipient-avatar"
                            />
                            <div className="gift-recipient-info">
                                <span className="gift-recipient-name">{displayName}</span>
                                <span className="gift-recipient-handle">@{recipientUsername}</span>
                            </div>
                        </div>

                        {/* БАЛАНС ОТПРАВИТЕЛЯ */}
                        <div className="gift-balance-row">
                            <span className="gift-balance-label">Ваш баланс:</span>
                            <span className="gift-balance-value">
                                <StellaCoinIcon size={16} /> {userBalance.toLocaleString("ru-RU")}
                            </span>
                        </div>

                        {/* БЫСТРЫЕ ПРЕСЕТЫ */}
                        <div className="gift-presets-grid">
                            {PRESET_AMOUNTS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    className={`gift-preset-chip${amount === String(preset) ? " active" : ""}`}
                                    onClick={() => setAmount(String(preset))}
                                >
                                    <span>+{preset}</span>
                                    <StellaCoinIcon size={14} />
                                </button>
                            ))}
                        </div>

                        {/* ПОЛЕ ВВОДА СУММЫ */}
                        <div className="gift-input-group">
                            <label className="gift-input-label" htmlFor="gift-coin-amount">
                                Сумма перевода:
                            </label>
                            <div className="gift-input-wrapper">
                                <input
                                    id="gift-coin-amount"
                                    type="text"
                                    inputMode="numeric"
                                    className="gift-amount-input"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                                    placeholder="Например, 100"
                                    disabled={loading}
                                />
                                <span className="gift-input-suffix">
                                    <StellaCoinIcon size={16} />
                                </span>
                            </div>
                        </div>

                        {errorMsg && <div className="gift-error-banner">{errorMsg}</div>}

                        {/* КНОПКИ ДЕЙСТВИЯ */}
                        <div className="gift-modal-actions">
                            <button
                                type="button"
                                className="gift-submit-btn"
                                onClick={handleSendGift}
                                disabled={loading || !amount || parseInt(amount, 10) <= 0}
                            >
                                {loading ? "Отправка…" : `Подарить ${amount || 0} Stellacoin`}
                            </button>
                            <button type="button" className="gift-cancel-btn" onClick={onClose} disabled={loading}>
                                Отмена
                            </button>
                        </div>
                    </>
                ) : (
                    /* УСПЕШНОЕ ЗАВЕРШЕНИЕ */
                    <div className="gift-success-state">
                        <div className="gift-success-icon">✓</div>
                        <h2 className="gift-modal-title">Подарок отправлен!</h2>
                        <p className="gift-modal-sub">
                            Вы успешно перевели <strong>{amount} Stellacoin</strong> пользователю <strong>@{recipientUsername}</strong>
                        </p>
                        <button type="button" className="gift-submit-btn" onClick={onClose}>
                            Отлично
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
