import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { getDeviceAccounts, type DeviceAccount } from "../../../api/sessions";
import { Avatar } from "../../UI/Avatar";
import "./AccountMenu.css";

interface AccountMenuProps {
    /** Presigned-аватар текущего пользователя (грузит Header). */
    avatarUrl: string | null;
}

/**
 * Меню профиля в шапке. Показывает текущий аккаунт и — если на устройстве
 * залогинен ещё кто-то — быстрый список для переключения БЕЗ пароля (сессии
 * ведёт сервер). Полное управление аккаунтами устройства — в Настройках.
 */
export const AccountMenu = ({ avatarUrl }: AccountMenuProps) => {
    const { user, logout, switchTo } = useAuthStore();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [others, setOthers] = useState<DeviceAccount[]>([]);
    const [switching, setSwitching] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Подтягиваем другие аккаунты устройства при открытии меню.
    useEffect(() => {
        if (!open) return;
        getDeviceAccounts()
            .then((list) => setOthers(list.filter((a) => !a.is_current)))
            .catch(() => setOthers([]));
    }, [open]);

    // Клик вне меню — закрыть.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const label = (email: string, username?: string | null, nickname?: string | null) =>
        nickname?.trim() || (username ? `@${username}` : email);

    const handleSwitch = async (id: string) => {
        setSwitching(id);
        try {
            await switchTo(id);
            setOpen(false);
            navigate("/");
        } finally {
            setSwitching(null);
        }
    };

    return (
        <div className="account-menu" ref={rootRef}>
            <button
                type="button"
                className={`account-trigger${open ? " open" : ""}`}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <Avatar
                    url={avatarUrl}
                    name={user?.nickname?.trim() || user?.email}
                    size={30}
                    className="header-avatar"
                />
                <span className="account-trigger-name">
                    {user?.nickname?.trim() || (user?.username ? `@${user.username}` : user?.email)}
                </span>
                <svg
                    className="account-chevron"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="account-dropdown" role="menu">
                    <button
                        type="button"
                        className="account-row account-row-current"
                        onClick={() => {
                            setOpen(false);
                            navigate("/profile");
                        }}
                    >
                        <Avatar
                            url={avatarUrl}
                            name={user?.nickname?.trim() || user?.email}
                            size={36}
                        />
                        <span className="account-row-text">
                            <span className="account-row-name">
                                {label(user?.email ?? "", user?.username, user?.nickname)}
                            </span>
                            <span className="account-row-sub">Мой профиль</span>
                        </span>
                    </button>

                    {others.length > 0 && (
                        <>
                            <div className="account-divider" />
                            <div className="account-section-title">Быстрое переключение</div>
                            {others.map((a) => (
                                <button
                                    key={a.id}
                                    type="button"
                                    className="account-row account-row-switch"
                                    onClick={() => handleSwitch(a.id)}
                                    disabled={switching !== null}
                                >
                                    <Avatar
                                        url={a.avatar_url}
                                        name={a.nickname?.trim() || a.email}
                                        size={36}
                                    />
                                    <span className="account-row-text">
                                        <span className="account-row-name">
                                            {label(a.email, a.username, a.nickname)}
                                        </span>
                                        <span className="account-row-sub">
                                            {switching === a.id ? "Переключаем…" : a.email}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </>
                    )}

                    <div className="account-divider" />
                    <button
                        type="button"
                        className="account-action"
                        onClick={() => {
                            setOpen(false);
                            navigate("/settings");
                        }}
                    >
                        Аккаунты и настройки
                    </button>
                    <button
                        type="button"
                        className="account-action account-action-danger"
                        onClick={() => {
                            setOpen(false);
                            logout();
                        }}
                    >
                        Выйти
                    </button>
                </div>
            )}
        </div>
    );
};
