import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getUnreadMessages } from "../../api/messages";
import { messagesSocket } from "../../api/messagesSocket";
import { useAuthStore } from "../../store/useAuthStore";
import "./MessagesButton.css";

/**
 * Иконка личных сообщений в шапке с бейджем непрочитанного. Счётчик обновляется
 * в реальном времени: первичное значение — один запрос при монтировании, дальше
 * пересчитываем на WS-события (новое сообщение / прочтение), без поллинга.
 */
export const MessagesButton = () => {
    const [unread, setUnread] = useState(0);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const refresh = useCallback(() => {
        if (!isAuthenticated) return;
        getUnreadMessages().then(setUnread).catch(() => {});
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        refresh();
        const unsubscribe = messagesSocket.subscribe((event) => {
            if (
                event.type === "message.new" ||
                event.type === "message.read" ||
                event.type === "message.delete"
            ) {
                refresh();
            }
        });
        return unsubscribe;
    }, [refresh, isAuthenticated]);

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
