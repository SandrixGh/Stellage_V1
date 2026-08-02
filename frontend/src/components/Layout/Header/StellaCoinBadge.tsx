import { useState } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { StellaCoinIcon } from "../../UI/StellaCoinIcon";
import { addStellaCoins } from "../../../api/profile";
import { formatCount } from "../../../utils/formatCount";
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
            const addVal = isNaN(amount) || amount <= 0 ? 1 : amount;
            await addStellaCoins(addVal);
            await useAuthStore.getState().getUser();
            setAdminAmount("");
        } catch (error) {
            console.error("Failed to add coins", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="stellacoin-badge"
            title={`Ваш баланс: ${coins.toLocaleString("ru-RU")} Stellacoin`}
        >
            <StellaCoinIcon size={22} />
            <span className="stellacoin-count">{formatCount(coins)}</span>
            {user?.username?.toLowerCase() === "sandrix" && (
                <div className="stellacoin-admin-add" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        inputMode="numeric"
                        className="stellacoin-admin-input"
                        value={adminAmount}
                        onChange={(e) => setAdminAmount(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddCoins();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="1"
                    />
                    <button
                        className="add-coins-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddCoins();
                        }}
                        disabled={isLoading}
                        title="Добавить Stellacoin"
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
};
