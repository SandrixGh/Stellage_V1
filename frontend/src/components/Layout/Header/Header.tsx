import { useEffect, useState, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { useStudyStore } from "../../../store/useStudyStore";
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
    const studyModeEnabled = useStudyStore((s) => s.studyModeEnabled);
    const navigate = useNavigate();
    const location = useLocation();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const navItems = [
        ...NAV_ITEMS,
        ...(studyModeEnabled ? [{ to: "/study", label: "Study", end: false }] : []),
    ];

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
    }, [location.pathname, studyModeEnabled]);

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
                <div className="header-brand-group">
                    <NavLink to="/" className="header-logo-wrapper">
                        <Logo className="header-logo-icon" size={34} />
                        <span className="header-logo-title">Stellage</span>
                    </NavLink>
                    {studyModeEnabled && (
                        <button
                            type="button"
                            className="study-header-badge"
                            onClick={() => navigate("/study")}
                            title="Перейти в Study Dashboard"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                            <span>Study</span>
                        </button>
                    )}
                </div>

                <nav className="header-nav" ref={navRef}>
                    <div
                        className="nav-active-pill"
                        style={{
                            transform: `translateX(${pillStyle.left}px)`,
                            width: `${pillStyle.width}px`,
                            opacity: pillStyle.opacity,
                        }}
                    />
                    {navItems.map((item) => (
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
