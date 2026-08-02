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
 * Меню профиля в шапке с четкой структурой, иконками для быстрой ориентации
 * и возможностью мгновенного переключения между аккаунтами на устройстве.
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

    // Клик вне меню и закрытие по Esc.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const formatHandle = (username?: string | null, email?: string) => {
        if (username?.trim()) return `@${username.trim()}`;
        return email ?? "";
    };

    const displayName = user?.nickname?.trim() || user?.username || user?.email || "Пользователь";

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

    const handleNavigate = (path: string) => {
        setOpen(false);
        navigate(path);
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
                    name={displayName}
                    size={30}
                    className="header-avatar"
                />
                <span className="account-trigger-name">{displayName}</span>
                <svg
                    className="account-chevron"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="account-dropdown" role="menu" tabIndex={-1}>
                    {/* КАРТОЧКА ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ */}
                    <div className="account-header-card">
                        <div className="account-header-info">
                            <Avatar
                                url={avatarUrl}
                                name={displayName}
                                size={44}
                                className="account-header-avatar"
                            />
                            <div className="account-header-details">
                                <span className="account-header-name" title={displayName}>
                                    {displayName}
                                </span>
                                <span className="account-header-handle" title={user?.email}>
                                    {formatHandle(user?.username, user?.email)}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="account-header-link"
                            onClick={() => handleNavigate("/profile")}
                        >
                            <span>Мой профиль</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="account-divider" />

                    {/* БЫСТРАЯ НАВИГАЦИЯ С ИКОНКАМИ */}
                    <div className="account-actions-group">
                        <button
                            type="button"
                            className="account-item-btn"
                            onClick={() => handleNavigate("/profile")}
                        >
                            <span className="account-item-icon icon-profile">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </span>
                            <span className="account-item-label">Профиль</span>
                        </button>

                        <button
                            type="button"
                            className="account-item-btn"
                            onClick={() => handleNavigate("/my-stellage")}
                        >
                            <span className="account-item-icon icon-shelf">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" />
                                    <path d="M3 9h18" />
                                    <path d="M3 15h18" />
                                    <path d="M9 3v18" />
                                    <path d="M15 3v18" />
                                </svg>
                            </span>
                            <span className="account-item-label">Мой стеллаж</span>
                        </button>

                        <button
                            type="button"
                            className="account-item-btn"
                            onClick={() => handleNavigate("/inventory")}
                        >
                            <span className="account-item-icon icon-inventory">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                    <path d="m3.3 7 8.7 5 8.7-5" />
                                    <path d="M12 22V12" />
                                </svg>
                            </span>
                            <span className="account-item-label">Инвентарь</span>
                        </button>

                        <button
                            type="button"
                            className="account-item-btn"
                            onClick={() => handleNavigate("/settings")}
                        >
                            <span className="account-item-icon icon-settings">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </span>
                            <span className="account-item-label">Настройки аккаунта</span>
                        </button>
                    </div>

                    {/* ПЕРЕКЛЮЧЕНИЕ АККАУНТОВ (ЕСЛИ ЕСТЬ ЕЩЁ) */}
                    {others.length > 0 && (
                        <>
                            <div className="account-divider" />
                            <div className="account-section-header">
                                <span>АККАУНТЫ НА УСТРОЙСТВЕ</span>
                            </div>
                            <div className="account-switch-list">
                                {others.map((a) => {
                                    const accName = a.nickname?.trim() || (a.username ? `@${a.username}` : a.email);
                                    return (
                                        <button
                                            key={a.id}
                                            type="button"
                                            className="account-switch-item"
                                            onClick={() => handleSwitch(a.id)}
                                            disabled={switching !== null}
                                        >
                                            <Avatar
                                                url={a.avatar_url}
                                                name={accName}
                                                size={32}
                                            />
                                            <div className="account-switch-info">
                                                <span className="account-switch-name">{accName}</span>
                                                <span className="account-switch-sub">
                                                    {switching === a.id ? "Переключение…" : a.email}
                                                </span>
                                            </div>
                                            <span className="account-switch-badge">Переключить</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <div className="account-divider" />

                    {/* КНОПКА ВЫХОДА */}
                    <button
                        type="button"
                        className="account-logout-btn"
                        onClick={() => {
                            setOpen(false);
                            logout();
                        }}
                    >
                        <span className="account-item-icon icon-logout">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </span>
                        <span className="account-item-label">Выйти из аккаунта</span>
                    </button>
                </div>
            )}
        </div>
    );
};

