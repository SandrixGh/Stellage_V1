import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import "./Header.css";
import { Logo } from "../../Logo/Logo";

const NAV_ITEMS = [
    { to: "/", label: "Главная", end: true },
    { to: "/search", label: "Поиск", end: false },
    { to: "/inventory", label: "Инвентарь", end: false },
    { to: "/my-stellage", label: "Мой стеллаж", end: false },
];

export const Header = () => {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();

    return (
        <header className="header">
            <div className="header-container">
                <NavLink to="/" className="header-logo-wrapper">
                    <Logo className="header-logo-icon" size={34} />
                    <span className="header-logo-title">Stellage</span>
                </NavLink>

                <nav className="header-nav">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `nav-link${isActive ? " active" : ""}`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="header-actions">
                    {isAuthenticated ? (
                        <>
                            <NavLink
                                to="/profile"
                                className={({ isActive }) =>
                                    `user-profile${isActive ? " active" : ""}`
                                }
                            >
                                <span className="user-avatar" aria-hidden="true">
                                    {(user?.nickname?.trim() || user?.email)?.trim()?.[0]?.toUpperCase() ?? "S"}
                                </span>
                                <span className="user-email">
                                    {user?.username ? `@${user.username}` : user?.email}
                                </span>
                            </NavLink>
                            <NavLink
                                to="/settings"
                                aria-label="Настройки аккаунта"
                                title="Настройки аккаунта"
                                className={({ isActive }) =>
                                    `settings-link${isActive ? " active" : ""}`
                                }
                            >
                                <svg
                                    className="settings-icon"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </NavLink>
                        </>
                    ) : (
                        <button
                            className="login-btn"
                            onClick={() => navigate("/login")}
                        >
                            Войти
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
