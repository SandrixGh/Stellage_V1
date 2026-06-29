import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import "./Header.css";
import { Logo } from "../../Logo/Logo";

const NAV_ITEMS = [
    { to: "/", label: "Главная", end: true },
    { to: "/feed", label: "Лента", end: false },
    { to: "/search", label: "Поиск", end: false },
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
