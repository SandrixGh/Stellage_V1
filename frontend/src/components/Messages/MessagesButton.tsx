import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getUnreadMessages } from "../../api/messages";
import "./MessagesButton.css";

const POLL_MS = 30_000;

/** Иконка личных сообщений в шапке с бейджем непрочитанного (опрос раз в 30с). */
export const MessagesButton = () => {
    const [unread, setUnread] = useState(0);

    const refresh = useCallback(() => {
        getUnreadMessages().then(setUnread).catch(() => {});
    }, []);

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, POLL_MS);
        return () => clearInterval(t);
    }, [refresh]);

    return (
        <NavLink
            to="/messages"
            aria-label="Сообщения"
            title="Сообщения"
            className={({ isActive }) => `msg-btn${isActive ? " active" : ""}`}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unread > 0 && <span className="msg-btn-badge">{unread > 9 ? "9+" : unread}</span>}
        </NavLink>
    );
};
