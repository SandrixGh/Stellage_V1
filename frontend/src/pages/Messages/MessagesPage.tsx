import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getConversation,
    getConversations,
    sendMessage,
    type ConversationPreview,
    type MessageItem,
} from "../../api/messages";
import { Avatar } from "../../components/UI/Avatar";
import { useAuthStore } from "../../store/useAuthStore";
import "./MessagesPage.css";

const timeAgo = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
        ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

/**
 * Личные сообщения: слева список диалогов, справа активная переписка.
 * Диалог адресуется по username в URL (/messages/:username), чтобы кнопка
 * «Написать» из профиля/коробки открывала нужного собеседника напрямую.
 */
export const MessagesPage = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingThread, setLoadingThread] = useState(false);
    const listEndRef = useRef<HTMLDivElement>(null);

    const loadConversations = useCallback(() => {
        getConversations()
            .then(setConversations)
            .catch(() => setConversations([]));
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadConversations();
    }, [isAuthenticated, loadConversations]);

    // Лента активного диалога.
    useEffect(() => {
        if (!username) {
            setMessages([]);
            return;
        }
        let cancelled = false;
        setLoadingThread(true);
        getConversation(username)
            .then((m) => {
                if (!cancelled) setMessages(m);
            })
            .catch(() => !cancelled && setMessages([]))
            .finally(() => !cancelled && setLoadingThread(false));
        return () => {
            cancelled = true;
        };
    }, [username]);

    // Автопрокрутка к последнему сообщению.
    useEffect(() => {
        listEndRef.current?.scrollIntoView({ block: "end" });
    }, [messages]);

    const handleSend = async () => {
        const text = draft.trim();
        if (!text || !username || sending) return;
        setSending(true);
        try {
            const msg = await sendMessage(username, text);
            setMessages((prev) => [...prev, msg]);
            setDraft("");
            loadConversations();
        } catch {
            /* тихо игнорируем — пользователь может повторить */
        } finally {
            setSending(false);
        }
    };

    if (!isAuthenticated) {
        return <div className="status-info">Войдите, чтобы читать сообщения.</div>;
    }

    return (
        <div className="msg-page">
            <aside className="msg-list">
                <h1 className="msg-list-title">Сообщения</h1>
                {conversations.length === 0 ? (
                    <p className="msg-list-empty">Пока нет диалогов.</p>
                ) : (
                    conversations.map((c) => {
                        const name = c.user.nickname?.trim() || c.user.username || "Пользователь";
                        const active = c.user.username === username;
                        return (
                            <button
                                key={c.user.id}
                                type="button"
                                className={`msg-conv${active ? " active" : ""}`}
                                onClick={() => c.user.username && navigate(`/messages/${c.user.username}`)}
                            >
                                <Avatar url={c.user.avatar_url} name={name} size={44} />
                                <span className="msg-conv-body">
                                    <span className="msg-conv-top">
                                        <span className="msg-conv-name">{name}</span>
                                        <span className="msg-conv-time">{timeAgo(c.last_at)}</span>
                                    </span>
                                    <span className="msg-conv-last">{c.last_text}</span>
                                </span>
                                {c.unread > 0 && <span className="msg-conv-badge">{c.unread}</span>}
                            </button>
                        );
                    })
                )}
            </aside>

            <section className="msg-thread">
                {!username ? (
                    <div className="msg-thread-empty">Выберите диалог слева.</div>
                ) : (
                    <>
                        <div className="msg-thread-head">
                            <button
                                type="button"
                                className="msg-thread-profile"
                                onClick={() => navigate(`/u/${username}`)}
                            >
                                @{username}
                            </button>
                        </div>

                        <div className="msg-thread-body">
                            {loadingThread ? (
                                <p className="msg-thread-hint">Загрузка…</p>
                            ) : messages.length === 0 ? (
                                <p className="msg-thread-hint">Сообщений пока нет. Напишите первым!</p>
                            ) : (
                                messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`msg-bubble${m.is_mine ? " mine" : ""}`}
                                    >
                                        <span className="msg-bubble-text">{m.text}</span>
                                        <span className="msg-bubble-time">{timeAgo(m.created_at)}</span>
                                    </div>
                                ))
                            )}
                            <div ref={listEndRef} />
                        </div>

                        <div className="msg-compose">
                            <textarea
                                className="msg-compose-input"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Написать сообщение…"
                                rows={1}
                                maxLength={4000}
                            />
                            <button
                                type="button"
                                className="msg-compose-send"
                                onClick={handleSend}
                                disabled={sending || !draft.trim()}
                            >
                                Отправить
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};
