import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import "./Header.css";
import { UserModal } from "./UserModal";
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

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <header className="header">
            <div className="header-container">
                <NavLink to="/" className="header-logo-wrapper">
                    <Logo className="header-logo-icon" size={30} />
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
                        <div
                            className="user-profile"
                            onClick={() => setIsModalOpen((v) => !v)}
                        >
                            <span className="user-email">{user?.email}</span>
                            <span className="settings-icon">⚙</span>
                        </div>
                    ) : (
                        <button
                            className="login-btn"
                            onClick={() => navigate("/login")}
                        >
                            Войти
                        </button>
                    )}

                    {isModalOpen && (
                        <UserModal onClose={() => setIsModalOpen(false)} />
                    )}
                </div>
            </div>
        </header>
    );
};
