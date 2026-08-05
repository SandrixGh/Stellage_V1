import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useStudyStore } from "../../store/useStudyStore";
import "./MobileTabBar.css";

export const MobileTabBar = () => {
    const studyModeEnabled = useStudyStore((s) => s.studyModeEnabled);
    const location = useLocation();

    const navRef = useRef<HTMLDivElement>(null);
    const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({
        left: 0,
        width: 0,
        opacity: 0,
    });

    // Если открыт конкретный чат с собеседником — скрываем плашку навигатора,
    // чтобы она не загораживала поле ввода сообщений. Показываем только на списке диалогов.
    const [hiddenInActiveChat, setHiddenInActiveChat] = useState(false);

    useEffect(() => {
        const checkActiveChat = () => {
            const hasThread = document.querySelector(".msg-page.has-active-thread") !== null;
            setHiddenInActiveChat(hasThread);
        };

        checkActiveChat();
        if (!location.pathname.startsWith("/messages")) {
            setHiddenInActiveChat(false);
            return;
        }

        const msgTarget = document.querySelector(".msg-page");
        if (!msgTarget) return;

        const observer = new MutationObserver(checkActiveChat);
        observer.observe(msgTarget, { attributes: true, attributeFilter: ["class"] });

        return () => observer.disconnect();
    }, [location.pathname]);

    useEffect(() => {
        const updatePill = () => {
            if (!navRef.current) return;
            const activeLink = navRef.current.querySelector<HTMLElement>(".mobile-tab-item.active");
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
        const timer = setTimeout(updatePill, 50);
        window.addEventListener("resize", updatePill);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", updatePill);
        };
    }, [location.pathname, studyModeEnabled, hiddenInActiveChat]);

    if (hiddenInActiveChat) return null;

    return (
        <aside className="mobile-tab-bar" aria-label="Мобильная навигация">
            <nav className="mobile-tab-capsule" ref={navRef}>
                <div
                    className="mobile-nav-active-pill"
                    style={{
                        transform: `translateX(${pillStyle.left}px)`,
                        width: `${pillStyle.width}px`,
                        opacity: pillStyle.opacity,
                    }}
                />

                <NavLink to="/" end className={({ isActive }) => `mobile-tab-item${isActive ? " active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>Главная</span>
                </NavLink>

                <NavLink to="/search" className={({ isActive }) => `mobile-tab-item${isActive ? " active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Поиск</span>
                </NavLink>

                <NavLink to="/inventory" className={({ isActive }) => `mobile-tab-item${isActive ? " active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <span>Инвентарь</span>
                </NavLink>

                <NavLink to="/my-stellage" className={({ isActive }) => `mobile-tab-item${isActive ? " active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="3" y1="15" x2="21" y2="15" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                    <span>Стеллаж</span>
                </NavLink>

                {studyModeEnabled && (
                    <NavLink to="/study" className={({ isActive }) => `mobile-tab-item${isActive ? " active" : ""}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                        </svg>
                        <span>Study</span>
                    </NavLink>
                )}
            </nav>
        </aside>
    );
};
