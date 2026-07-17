import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { useAccountsStore } from "../../../store/useAccountsStore";
import { Avatar } from "../../UI/Avatar";
import "./AccountMenu.css";

interface AccountMenuProps {
    /** Presigned-аватар текущего пользователя (грузит Header). */
    avatarUrl: string | null;
}

/**
 * Меню профиля в шапке с быстрым переключением аккаунтов. Так как сессия — одна
 * cookie на браузер, «переключение» = выйти из текущего и открыть логин с
 * предзаполненным email выбранного аккаунта (пароль вводится). Никакие секреты
 * в браузере не хранятся — только список отображаемых данных.
 */
export const AccountMenu = ({ avatarUrl }: AccountMenuProps) => {
    const { user, logout } = useAuthStore();
    const { accounts, remember, forget } = useAccountsStore();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Дописываем свежий аватар в запись текущего аккаунта, чтобы в меню у
    // остальных вкладок он тоже показывался.
    useEffect(() => {
        if (user?.email && avatarUrl) {
            remember({
                email: user.email,
                username: user.username,
                nickname: user.nickname,
                avatarUrl,
            });
        }
    }, [user?.email, user?.username, user?.nickname, avatarUrl, remember]);

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

    const currentEmail = user?.email?.toLowerCase();
    const others = accounts.filter((a) => a.email.toLowerCase() !== currentEmail);

    const label = (email: string, username?: string | null, nickname?: string | null) =>
        nickname?.trim() || (username ? `@${username}` : email);

    const switchTo = async (email: string) => {
        setOpen(false);
        // Освобождаем единственную cookie, затем открываем логин с prefill.
        await logout();
        navigate("/login", { state: { prefillEmail: email } });
    };

    const addAccount = async () => {
        setOpen(false);
        await logout();
        navigate("/login");
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
                    {user?.username ? `@${user.username}` : user?.email}
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
                            <div className="account-section-title">Сменить аккаунт</div>
                            {others.map((a) => (
                                <div key={a.email} className="account-row account-row-switch">
                                    <button
                                        type="button"
                                        className="account-row-main"
                                        onClick={() => switchTo(a.email)}
                                    >
                                        <Avatar
                                            url={a.avatarUrl ?? null}
                                            name={a.nickname?.trim() || a.email}
                                            size={36}
                                        />
                                        <span className="account-row-text">
                                            <span className="account-row-name">
                                                {label(a.email, a.username, a.nickname)}
                                            </span>
                                            <span className="account-row-sub">{a.email}</span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="account-forget"
                                        title="Убрать из списка"
                                        aria-label="Убрать из списка"
                                        onClick={() => forget(a.email)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </>
                    )}

                    <div className="account-divider" />
                    <button type="button" className="account-action" onClick={addAccount}>
                        + Добавить аккаунт
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
