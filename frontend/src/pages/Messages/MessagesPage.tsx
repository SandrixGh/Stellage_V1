import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    deleteMessage,
    editMessage,
    getConversation,
    getConversations,
    sendAttachment,
    sendMessage,
    type ConversationPreview,
    type MessageItem,
} from "../../api/messages";
import { ACCEPT_ATTR, MAX_BYTES, kindForMime, uploadErrorMessage } from "../../api/assets";
import { Avatar } from "../../components/UI/Avatar";
import { useAuthStore } from "../../store/useAuthStore";
import "./MessagesPage.css";

const POLL_MS = 12_000;
const PAGE_SIZE = 40; // совпадает с backend limit — так понимаем, есть ли ещё

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
 * Поддержка текста, фото/видео-вложений, карточек подарка, правки/удаления
 * своих сообщений, догрузки истории и лёгкого автообновления ленты.
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
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [uploadPct, setUploadPct] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Инлайн-редактор: id сообщения и черновик.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");

    const listEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const loadConversations = useCallback(() => {
        getConversations()
            .then(setConversations)
            .catch(() => setConversations([]));
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadConversations();
    }, [isAuthenticated, loadConversations]);

    // Первичная загрузка ленты активного диалога.
    useEffect(() => {
        if (!username) {
            setMessages([]);
            return;
        }
        let cancelled = false;
        setLoadingThread(true);
        setError(null);
        setEditingId(null);
        getConversation(username)
            .then((m) => {
                if (cancelled) return;
                setMessages(m);
                setHasMore(m.length >= PAGE_SIZE);
            })
            .catch(() => !cancelled && setMessages([]))
            .finally(() => !cancelled && setLoadingThread(false));
        return () => {
            cancelled = true;
        };
    }, [username]);

    // Лёгкое автообновление: подтягиваем свежую ленту, добавляя новые сообщения
    // в конец. Без before — заодно помечает входящие прочитанными.
    useEffect(() => {
        if (!username) return;
        const id = setInterval(async () => {
            try {
                const fresh = await getConversation(username);
                setMessages((prev) => {
                    if (prev.length === 0) return fresh;
                    const lastKnown = prev[prev.length - 1]?.created_at ?? "";
                    const newer = fresh.filter((m) => m.created_at > lastKnown);
                    // Также обновляем прочитанность/правки существующих.
                    if (newer.length === 0) return fresh.length >= prev.length ? fresh : prev;
                    return [...prev, ...newer];
                });
            } catch {
                /* тихо — следующий тик попробует снова */
            }
        }, POLL_MS);
        return () => clearInterval(id);
    }, [username]);

    // Автопрокрутка к последнему сообщению при изменении хвоста ленты.
    useEffect(() => {
        listEndRef.current?.scrollIntoView({ block: "end" });
    }, [messages.length]);

    const loadOlder = async () => {
        if (!username || loadingMore || messages.length === 0) return;
        setLoadingMore(true);
        const oldest = messages[0].created_at;
        const container = bodyRef.current;
        const prevHeight = container?.scrollHeight ?? 0;
        try {
            const older = await getConversation(username, oldest);
            setMessages((prev) => [...older, ...prev]);
            setHasMore(older.length >= PAGE_SIZE);
            // Сохраняем позицию прокрутки, чтобы не «прыгало» вверх.
            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight - prevHeight;
                }
            });
        } catch {
            /* игнорируем */
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSend = async () => {
        const text = draft.trim();
        if (!text || !username || sending) return;
        setSending(true);
        setError(null);
        try {
            const msg = await sendMessage(username, text);
            setMessages((prev) => [...prev, msg]);
            setDraft("");
            loadConversations();
        } catch {
            setError("Не удалось отправить сообщение.");
        } finally {
            setSending(false);
        }
    };

    const handlePickFile = () => fileInputRef.current?.click();

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !username || uploadPct !== null) return;

        const kind = kindForMime(file.type);
        if (!kind) {
            setError("Поддерживаются фото (JPEG/PNG/WebP/GIF) и видео (MP4/WebM).");
            return;
        }
        if (file.size > MAX_BYTES[kind]) {
            setError(kind === "photo" ? "Фото больше 10 МБ." : "Видео больше 200 МБ.");
            return;
        }

        setError(null);
        setUploadPct(0);
        try {
            const msg = await sendAttachment(username, file, draft, (f) =>
                setUploadPct(Math.round(f * 100)),
            );
            setMessages((prev) => [...prev, msg]);
            setDraft("");
            loadConversations();
        } catch (err) {
            setError(uploadErrorMessage(err));
        } finally {
            setUploadPct(null);
        }
    };

    const startEdit = (m: MessageItem) => {
        setEditingId(m.id);
        setEditDraft(m.text ?? "");
    };

    const saveEdit = async (id: string) => {
        const text = editDraft.trim();
        if (!text) return;
        try {
            const updated = await editMessage(id, text);
            setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
            setEditingId(null);
        } catch {
            setError("Не удалось изменить сообщение.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Удалить сообщение? Оно исчезнет у обоих.")) return;
        try {
            await deleteMessage(id);
            setMessages((prev) => prev.filter((m) => m.id !== id));
            loadConversations();
        } catch {
            setError("Не удалось удалить сообщение.");
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

                        <div className="msg-thread-body" ref={bodyRef}>
                            {hasMore && (
                                <div className="msg-load-more">
                                    <button
                                        type="button"
                                        className="msg-load-more-btn"
                                        onClick={loadOlder}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? "Загрузка…" : "Показать раньше"}
                                    </button>
                                </div>
                            )}

                            {loadingThread ? (
                                <p className="msg-thread-hint">Загрузка…</p>
                            ) : messages.length === 0 ? (
                                <p className="msg-thread-hint">Сообщений пока нет. Напишите первым!</p>
                            ) : (
                                messages.map((m) => (
                                    <MessageBubble
                                        key={m.id}
                                        message={m}
                                        editing={editingId === m.id}
                                        editDraft={editDraft}
                                        onEditDraft={setEditDraft}
                                        onStartEdit={() => startEdit(m)}
                                        onCancelEdit={() => setEditingId(null)}
                                        onSaveEdit={() => saveEdit(m.id)}
                                        onDelete={() => handleDelete(m.id)}
                                        onOpenGift={
                                            m.gift_instance_id
                                                ? () => navigate(`/box/instance/${m.gift_instance_id}`)
                                                : undefined
                                        }
                                    />
                                ))
                            )}
                            <div ref={listEndRef} />
                        </div>

                        {error && <div className="msg-error">{error}</div>}

                        <div className="msg-compose">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPT_ATTR}
                                hidden
                                onChange={handleFile}
                            />
                            <button
                                type="button"
                                className="msg-compose-attach"
                                onClick={handlePickFile}
                                disabled={uploadPct !== null}
                                title="Прикрепить фото или видео"
                                aria-label="Прикрепить фото или видео"
                            >
                                {uploadPct !== null ? `${uploadPct}%` : "＋"}
                            </button>
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

interface BubbleProps {
    message: MessageItem;
    editing: boolean;
    editDraft: string;
    onEditDraft: (v: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onDelete: () => void;
    onOpenGift?: () => void;
}

const MessageBubble = ({
    message: m,
    editing,
    editDraft,
    onEditDraft,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    onOpenGift,
}: BubbleProps) => {
    // Системная карточка подарка — особый пузырь по центру.
    if (m.kind === "gift") {
        return (
            <button type="button" className="msg-gift" onClick={onOpenGift}>
                <span className="msg-gift-icon">🎁</span>
                <span className="msg-gift-text">
                    {m.is_mine ? "Вы подарили коробку" : "Вам подарили коробку"}
                    {m.gift_box_title ? `: «${m.gift_box_title}»` : ""}
                </span>
            </button>
        );
    }

    return (
        <div className={`msg-bubble${m.is_mine ? " mine" : ""}`}>
            {m.asset_url && m.asset_kind === "photo" && (
                <a
                    href={m.asset_url}
                    target="_blank"
                    rel="noreferrer"
                    className="msg-bubble-media"
                >
                    <img src={m.asset_url} alt={m.asset_name ?? "Фото"} loading="lazy" />
                </a>
            )}
            {m.asset_url && m.asset_kind === "video" && (
                <video className="msg-bubble-media" src={m.asset_url} controls preload="metadata" />
            )}

            {editing ? (
                <div className="msg-edit">
                    <textarea
                        className="msg-edit-input"
                        value={editDraft}
                        onChange={(e) => onEditDraft(e.target.value)}
                        rows={2}
                        maxLength={4000}
                        autoFocus
                    />
                    <div className="msg-edit-actions">
                        <button type="button" onClick={onSaveEdit} className="msg-edit-save">
                            Сохранить
                        </button>
                        <button type="button" onClick={onCancelEdit} className="msg-edit-cancel">
                            Отмена
                        </button>
                    </div>
                </div>
            ) : (
                m.text && <span className="msg-bubble-text">{m.text}</span>
            )}

            <span className="msg-bubble-meta">
                {m.edited && <span className="msg-bubble-edited">изменено</span>}
                <span className="msg-bubble-time">{timeAgo(m.created_at)}</span>
            </span>

            {m.is_mine && !editing && (
                <div className="msg-bubble-actions">
                    {m.text !== null && (
                        <button type="button" onClick={onStartEdit} title="Изменить">
                            ✎
                        </button>
                    )}
                    <button type="button" onClick={onDelete} title="Удалить">
                        🗑
                    </button>
                </div>
            )}
        </div>
    );
};
