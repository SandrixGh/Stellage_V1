import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import {
    getDeviceAccounts,
    unlinkAccount,
    type DeviceAccount,
} from "../../api/sessions";
import { Avatar } from "../UI/Avatar";
import "./DeviceAccounts.css";

/**
 * Управление аккаунтами устройства (в Настройках). Список ведёт сервер: пока
 * жива refresh-сессия аккаунта (по умолчанию месяц), переключение на него —
 * без пароля. «Добавить аккаунт» = один вход, дальше аккаунт остаётся здесь.
 */
export const DeviceAccounts = () => {
    const navigate = useNavigate();
    const { user, switchTo, logout } = useAuthStore();
    const [accounts, setAccounts] = useState<DeviceAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        getDeviceAccounts()
            .then(setAccounts)
            .catch(() => setAccounts([]))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const label = (a: DeviceAccount) =>
        a.nickname?.trim() || (a.username ? `@${a.username}` : a.email);

    const handleSwitch = async (id: string) => {
        setBusy(id);
        try {
            await switchTo(id);
            navigate("/");
        } finally {
            setBusy(null);
        }
    };

    const handleRemove = async (id: string) => {
        setBusy(id);
        try {
            await unlinkAccount(id);
            load();
        } finally {
            setBusy(null);
        }
    };

    // Добавить аккаунт = выйти из текущего и открыть вход. Текущий останется в
    // списке устройства, так что позже переключимся обратно без пароля.
    const handleAdd = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <section className="profile-card">
            <h2 className="profile-card-title">Аккаунты на этом устройстве</h2>
            <p className="device-accounts-hint">
                Войдите один раз — и переключайтесь между аккаунтами без повторного
                ввода пароля. Вход снова понадобится примерно раз в месяц.
            </p>

            {loading ? (
                <p className="device-accounts-empty">Загрузка…</p>
            ) : (
                <ul className="device-accounts-list">
                    {accounts.map((a) => {
                        const current = a.is_current || a.id === user?.id;
                        return (
                            <li key={a.id} className={`device-account${current ? " current" : ""}`}>
                                <Avatar url={a.avatar_url} name={label(a)} size={40} />
                                <span className="device-account-text">
                                    <span className="device-account-name">{label(a)}</span>
                                    <span className="device-account-sub">{a.email}</span>
                                </span>
                                {current ? (
                                    <span className="device-account-badge">Текущий</span>
                                ) : (
                                    <span className="device-account-actions">
                                        <button
                                            type="button"
                                            className="device-account-switch"
                                            onClick={() => handleSwitch(a.id)}
                                            disabled={busy !== null}
                                        >
                                            {busy === a.id ? "…" : "Войти"}
                                        </button>
                                        <button
                                            type="button"
                                            className="device-account-remove"
                                            onClick={() => handleRemove(a.id)}
                                            disabled={busy !== null}
                                            title="Убрать с устройства"
                                            aria-label="Убрать с устройства"
                                        >
                                            ×
                                        </button>
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <button type="button" className="device-account-add" onClick={handleAdd}>
                + Добавить аккаунт
            </button>
        </section>
    );
};
