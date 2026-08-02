import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import type { BoxTemplate } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { StellaCoinIcon } from "../UI/StellaCoinIcon";
import { getRarityClass, resolveContentType, resolveRarityVisual } from "../../data/mockTemplates";
import "./BuyBoxModal.css";

interface BuyBoxModalProps {
    template: BoxTemplate;
    onClose: () => void;
    onSuccess?: () => void;
    onOpenTopUp?: () => void;
}

export const BuyBoxModal: React.FC<BuyBoxModalProps> = ({
    template,
    onClose,
    onSuccess,
    onOpenTopUp,
}) => {
    const navigate = useNavigate();
    const { user, getUser } = useAuthStore();
    const { acquireBox } = useStellageStore();

    const [isBuying, setIsBuying] = useState(false);
    const [bought, setBought] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const priceCoins = Math.round(Number(template.price) || 0);
    const userCoins = user?.stella_coins ?? 0;
    const isEnough = userCoins >= priceCoins;
    const remaining = userCoins - priceCoins;

    const { rarityGlow, boxColor } = resolveRarityVisual(template.rarity);
    const rarityClass = getRarityClass(template.rarity);

    const handleConfirmBuy = async () => {
        if (!isEnough || isBuying || bought) return;
        setIsBuying(true);
        setErrorMsg(null);

        try {
            await acquireBox(template.id);
            await getUser(); // Refresh balance in header
            setBought(true);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Не удалось совершить покупку");
        } finally {
            setIsBuying(false);
        }
    };

    return (
        <div className="buy-modal-backdrop" onClick={onClose}>
            <div
                className={`buy-modal-content rarity-${rarityClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="buy-modal-close" onClick={onClose}>
                    ✕
                </button>

                <div className="buy-modal-visual">
                    <WireframeBox
                        size={160}
                        rarityGlow={rarityGlow}
                        color={boxColor}
                        contentType={resolveContentType(template)}
                    />
                </div>

                <div className="buy-modal-details">
                    <span className={`rarity-tag rarity-tag-${rarityClass}`}>
                        {template.rarity}
                    </span>

                    <h2 className="buy-modal-title">{template.title}</h2>
                    {template.description && (
                        <p className="buy-modal-desc">{template.description}</p>
                    )}

                    {!bought ? (
                        <>
                            <div className="buy-modal-balance-card">
                                <div className="balance-row">
                                    <span>Стоимость:</span>
                                    <strong className="coin-value">
                                        <StellaCoinIcon size={18} /> {priceCoins.toLocaleString("ru-RU")}
                                    </strong>
                                </div>
                                <div className="balance-row">
                                    <span>Ваш баланс:</span>
                                    <span className="coin-value">
                                        <StellaCoinIcon size={18} /> {userCoins.toLocaleString("ru-RU")}
                                    </span>
                                </div>
                                <hr className="balance-divider" />
                                <div className="balance-row remaining-row">
                                    <span>Остаток после покупки:</span>
                                    <span className={`coin-value ${isEnough ? "enough" : "not-enough"}`}>
                                        <StellaCoinIcon size={18} /> {remaining >= 0 ? remaining.toLocaleString("ru-RU") : 0}
                                    </span>
                                </div>
                            </div>

                            {errorMsg && <div className="buy-modal-error">{errorMsg}</div>}

                            {!isEnough && (
                                <div className="buy-modal-warning">
                                    Недостаточно Stellacoin на балансе для покупки этой коробки.
                                </div>
                            )}

                            <div className="buy-modal-actions">
                                {!isEnough ? (
                                    <button
                                        type="button"
                                        className="buy-btn-topup"
                                        onClick={() => {
                                            onClose();
                                            if (onOpenTopUp) onOpenTopUp();
                                        }}
                                    >
                                        <span>Пополнить баланс</span>
                                        <StellaCoinIcon size={18} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="buy-btn-confirm"
                                        onClick={handleConfirmBuy}
                                        disabled={isBuying}
                                    >
                                        {isBuying ? "Покупка..." : (
                                            <>
                                                <span>Оплатить</span>
                                                <StellaCoinIcon size={18} />
                                                <span>{priceCoins.toLocaleString("ru-RU")}</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="buy-modal-success">
                            <div className="success-icon">✓</div>
                            <h3>Покупка успешно совершена!</h3>
                            <p>Коробка «{template.title}» добавлена в ваш инвентарь.</p>
                            <div className="buy-modal-actions">
                                <button
                                    type="button"
                                    className="buy-btn-confirm"
                                    onClick={() => navigate("/inventory")}
                                >
                                    Перейти в инвентарь
                                </button>
                                <button
                                    type="button"
                                    className="buy-btn-secondary"
                                    onClick={onClose}
                                >
                                    Остаться в ленте
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
