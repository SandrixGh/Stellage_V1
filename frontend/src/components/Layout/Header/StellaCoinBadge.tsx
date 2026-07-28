import { useState } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import coinLogo from "../../Logo/StellaCoin.png";
import { addStellaCoins } from "../../../api/profile";
import "./Header.css";

export const StellaCoinBadge = () => {
    const user = useAuthStore((s) => s.user);
    const coins = user?.stella_coins ?? 0;
    const [isLoading, setIsLoading] = useState(false);
    const [adminAmount, setAdminAmount] = useState("");

    const handleAddCoins = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const amount = parseInt(adminAmount, 10);
            await addStellaCoins(isNaN(amount) ? 1 : amount);
            await useAuthStore.getState().getUser();
        } catch (error) {
            console.error("Failed to add coins", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="stellacoin-badge" title="Ваш баланс StellaCoin">
            <img
                src={coinLogo}
                alt="StellaCoin"
                className="stellacoin-icon"
                width={32}
                height={32}
            />
            <span className="stellacoin-count">{coins.toLocaleString("ru-RU")}</span>
            {user?.username?.toLowerCase() === "sandrix" && (
                <div className="stellacoin-admin-add">
                    <input
                        type="text"
                        inputMode="numeric"
                        className="stellacoin-admin-input"
                        value={adminAmount}
                        onChange={(e) => setAdminAmount(e.target.value.replace(/\D/g, ""))}
                        placeholder="1"
                    />
                    <button
                        className="add-coins-btn"
                        onClick={handleAddCoins}
                        disabled={isLoading}
                        title="Добавить StellaCoin"
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
};
