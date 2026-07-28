import { useAuthStore } from "../../../store/useAuthStore";
import coinLogo from "../../Logo/StellaCoin.png";
import "./Header.css";

export const StellaCoinBadge = () => {
    const coins = useAuthStore((s) => s.user?.stella_coins ?? 0);

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
        </div>
    );
};
