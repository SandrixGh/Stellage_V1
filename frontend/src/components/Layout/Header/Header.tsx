import { useEffect, useState, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { NotificationBell } from "../../Notifications/NotificationBell";
import { MessagesButton } from "../../Messages/MessagesButton";
import { AccountMenu } from "./AccountMenu";
import { getMyProfile } from "../../../api/profile";
import { StellaCoinBadge } from "./StellaCoinBadge";
import "./Header.css";
import { Logo } from "../../Logo/Logo";

const NAV_ITEMS = [
    { to: "/", label: "Главная", end: true },
    { to: "/search", label: "Поиск", end: false },
    { to: "/inventory", label: "Инвентарь", end: false },
    { to: "/my-stellage", label: "Мой стеллаж", end: false },
];

export const Header = () => {
    const { isAuthenticated } = useAuthStore();
    const userId = useAuthStore((s) => s.user?.id);
    const navigate = useNavigate();
    const location = useLocation();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const navRef = useRef<HTMLDivElement>(null);
    const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({
        left: 0,
        width: 0,
        opacity: 0,
    });

    useEffect(() => {
        const updatePill = () => {
            if (!navRef.current) return;
            const activeLink = navRef.current.querySelector<HTMLElement>(".nav-link.active");
            if (activeLink) {
                const navRect = navRef.current.getBoundingClientRect();
                const linkRect = activeLink.getBoundingClientRect();
                setPillStyle({
                    left: linkRect.left - navRect.left,
                    width: linkRect.width,
                    opacity: 1,
                });
            } else {
                setPillStyle((s) => ({ ...s, opacity: 0 }));
            }
        };

        updatePill();
        window.addEventListener("resize", updatePill);
        return () => window.removeEventListener("resize", updatePill);
    }, [location.pathname]);

    // Свой аватар для шапки (presigned из /profile/me). Пере-запрашиваем при
    // смене активного аккаунта (userId), а не только при входе/выходе.
    useEffect(() => {
        if (!isAuthenticated) {
            setAvatarUrl(null);
            return;
        }
        getMyProfile()
            .then((p) => setAvatarUrl(p.avatar_url ?? null))
            .catch(() => setAvatarUrl(null));
    }, [isAuthenticated, userId]);

    return (
        <header className="header">
            <div className="header-container">
                <NavLink to="/" className="header-logo-wrapper">
                    <Logo className="header-logo-icon" size={34} />
                    <span className="header-logo-title">Stellage</span>
                </NavLink>

                <nav className="header-nav" ref={navRef}>
                    <div
                        className="nav-active-pill"
                        style={{
                            transform: `translateX(${pillStyle.left}px)`,
                            width: `${pillStyle.width}px`,
                            opacity: pillStyle.opacity,
                        }}
                    />
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
                            <StellaCoinBadge />
                            <MessagesButton />
                            <NotificationBell />
                            <AccountMenu avatarUrl={avatarUrl} />
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
