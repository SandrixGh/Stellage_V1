import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    getNotifications,
    getUnreadCount,
    markNotificationsRead,
    type NotificationItem,
} from "../../api/notifications";
import { Avatar } from "../UI/Avatar";
import "./NotificationBell.css";

const POLL_MS = 30_000;

const actorName = (n: NotificationItem): string =>
    n.actor.nickname?.trim() || n.actor.username || "Кто-то";

const describe = (n: NotificationItem): string => {
    if (n.type === "follow") return "подписался(ась) на вас";
    if (n.type === "box_like") {
        return n.box_title ? `оценил(а) вашу коробку «${n.box_title}»` : "оценил(а) вашу коробку";
    }
    if (n.type === "message") return "написал(а) вам сообщение";
    if (n.type === "gift") {
        return n.box_title ? `подарил(а) вам коробку «${n.box_title}»` : "подарил(а) вам коробку";
    }
    return "";
};

const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "только что";
    if (m < 60) return `${m} мин`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ч`;
    const d = Math.floor(h / 24);
    return `${d} дн`;
};

export const NotificationBell = () => {
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[] | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const refreshUnread = useCallback(() => {
        getUnreadCount().then(setUnread).catch(() => {});
    }, []);

    // Опрос счётчика непрочитанного (и при монтировании).
    useEffect(() => {
        refreshUnread();
        const t = setInterval(refreshUnread, POLL_MS);
        return () => clearInterval(t);
    }, [refreshUnread]);

    // Клик вне дропдауна — закрыть.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [open]);

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next) {
            setItems(null);
            try {
                const list = await getNotifications();
                setItems(list);
                // Открытие = прочтение: гасим бейдж.
                if (unread > 0) {
                    await markNotificationsRead();
                    setUnread(0);
                }
            } catch {
                setItems([]);
            }
        }
    };

    return (
        <div className="notif" ref={ref}>
            <button
                type="button"
                className="notif-bell"
                aria-label="Уведомления"
                onClick={toggle}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown-head">Уведомления</div>
                    <div className="notif-list">
                        {items === null ? (
                            <p className="notif-empty">Загрузка…</p>
                        ) : items.length === 0 ? (
                            <p className="notif-empty">Пока пусто.</p>
                        ) : (
                            items.map((n) => {
                                const name = actorName(n);
                                const inner = (
                                    <>
                                        <Avatar url={n.actor.avatar_url} name={name} size={36} />
                                        <div className="notif-text">
                                            <span>
                                                <b>{name}</b> {describe(n)}
                                            </span>
                                            <span className="notif-time">{timeAgo(n.created_at)}</span>
                                        </div>
                                        {!n.is_read && <span className="notif-dot" aria-hidden="true" />}
                                    </>
                                );
                                // Сообщение ведёт в чат с отправителем, остальное —
                                // на профиль актора.
                                const target =
                                    n.type === "message"
                                        ? `/messages/${n.actor.username}`
                                        : `/u/${n.actor.username}`;
                                return n.actor.username ? (
                                    <Link
                                        key={n.id}
                                        to={target}
                                        className="notif-item"
                                        onClick={() => setOpen(false)}
                                    >
                                        {inner}
                                    </Link>
                                ) : (
                                    <div key={n.id} className="notif-item">
                                        {inner}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
