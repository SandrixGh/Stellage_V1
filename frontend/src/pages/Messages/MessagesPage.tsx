import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { api } from "../../api/instance";
import { ACCEPT_ATTR, MAX_BYTES, kindForMime, uploadErrorMessage } from "../../api/assets";
import type { PublicProfile } from "../../types/Profile/profile";
import { Avatar } from "../../components/UI/Avatar";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { MessageMediaLightbox } from "./MessageMediaLightbox";
import { resolveRarityVisual } from "../../data/mockTemplates";
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

/** Время сообщения (ЧЧ:ММ) — для метки внутри пузыря. */
const clock = (iso: string): string =>
    new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

/** Ярлык разделителя дат: «Сегодня» / «Вчера» / дата. */
const dayLabel = (iso: string): string => {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Сегодня";
    if (d.toDateString() === yest.toDateString()) return "Вчера";
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

const dayKey = (iso: string): string => new Date(iso).toDateString();

/** Локальный стейджинг вложения перед отправкой: превью + подпись. */
interface StagedFile {
    file: File;
    kind: "photo" | "video";
    previewUrl: string;
}

/**
 * Личные сообщения: слева список диалогов, справа активная переписка. Страница —
 * самодостаточный экран во всю высоту вьюпорта; прокручивается ТОЛЬКО лента
 * сообщений, поле ввода и шапка диалога зафиксированы. Поддержка текста,
 * фото/видео с подписью, карточек подарка, правки/удаления, догрузки истории
 * и лёгкого автообновления.
 */
export const MessagesPage = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [peer, setPeer] = useState<PublicProfile | null>(null);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingThread, setLoadingThread] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [uploadPct, setUploadPct] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");
    // Прикреплённый, но ещё не отправленный файл (ждём подпись).
    const [staged, setStaged] = useState<StagedFile | null>(null);
    // Открытое меню «плюс».
    const [attachMenu, setAttachMenu] = useState(false);
    // Просмотр фото/видео из сообщения в лайтбоксе (url + тип).
    const [lightbox, setLightbox] = useState<MessageItem | null>(null);
    // Показывать кнопку «вниз», когда лента прокручена вверх.
    const [showScrollDown, setShowScrollDown] = useState(false);

    const listEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const attachRef = useRef<HTMLDivElement>(null);
    const composeRef = useRef<HTMLTextAreaElement>(null);

    // Авторост поля ввода под текст (до max-height из CSS).
    const growCompose = () => {
        const el = composeRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    const loadConversations = useCallback(() => {
        getConversations()
            .then(setConversations)
            .catch(() => setConversations([]));
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadConversations();
    }, [isAuthenticated, loadConversations]);

    // Профиль собеседника (аватар + ник) для шапки диалога.
    useEffect(() => {
        if (!username) {
            setPeer(null);
            return;
        }
        let cancelled = false;
        api.get<PublicProfile>(`/profile/public/${username}`)
            .then((r) => !cancelled && setPeer(r.data))
            .catch(() => !cancelled && setPeer(null));
        return () => {
            cancelled = true;
        };
    }, [username]);

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
        setStaged(null);
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

    // Лёгкое автообновление открытого диалога.
    useEffect(() => {
        if (!username) return;
        const id = setInterval(async () => {
            try {
                const fresh = await getConversation(username);
                setMessages((prev) => {
                    if (prev.length === 0) return fresh;
                    const lastKnown = prev[prev.length - 1]?.created_at ?? "";
                    const newer = fresh.filter((m) => m.created_at > lastKnown);
                    if (newer.length === 0) return fresh.length >= prev.length ? fresh : prev;
                    return [...prev, ...newer];
                });
            } catch {
                /* тихо — следующий тик попробует снова */
            }
        }, POLL_MS);
        return () => clearInterval(id);
    }, [username]);

    // Автопрокрутка к последнему сообщению при изменении хвоста ленты — только
    // если пользователь и так внизу (не отрываем от чтения истории).
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
        if (nearBottom) listEndRef.current?.scrollIntoView({ block: "end" });
    }, [messages.length]);

    const scrollToBottom = () => {
        listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    // Следим за прокруткой ленты — показываем кнопку «вниз», когда ушли вверх.
    const onBodyScroll = () => {
        const el = bodyRef.current;
        if (!el) return;
        setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
    };

    // Клик вне меню «плюс» — закрыть.
    useEffect(() => {
        if (!attachMenu) return;
        const onClick = (e: MouseEvent) => {
            if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
                setAttachMenu(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [attachMenu]);

    // Освобождаем objectURL превью при смене/сбросе стейджинга.
    useEffect(() => {
        return () => {
            if (staged) URL.revokeObjectURL(staged.previewUrl);
        };
    }, [staged]);

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
            requestAnimationFrame(() => {
                if (container) container.scrollTop = container.scrollHeight - prevHeight;
            });
        } catch {
            /* игнорируем */
        } finally {
            setLoadingMore(false);
        }
    };

    // Единая отправка: если есть прикреплённый файл — шлём его с подписью
    // (draft), иначе — обычный текст.
    const handleSend = async () => {
        if (!username || sending || uploadPct !== null) return;
        const text = draft.trim();

        if (staged) {
            setSending(true);
            setError(null);
            setUploadPct(0);
            try {
                const msg = await sendAttachment(username, staged.file, text, (f) =>
                    setUploadPct(Math.round(f * 100)),
                );
                setMessages((prev) => [...prev, msg]);
                setDraft("");
                setStaged(null);
                loadConversations();
            } catch (err) {
                setError(uploadErrorMessage(err));
            } finally {
                setUploadPct(null);
                setSending(false);
            }
            return;
        }

        if (!text) return;
        setSending(true);
        setError(null);
        try {
            const msg = await sendMessage(username, text);
            setMessages((prev) => [...prev, msg]);
            setDraft("");
            if (composeRef.current) composeRef.current.style.height = "auto";
            loadConversations();
        } catch {
            setError("Не удалось отправить сообщение.");
        } finally {
            setSending(false);
        }
    };

    const handlePickFile = () => {
        setAttachMenu(false);
        fileInputRef.current?.click();
    };

    // Выбор файла НЕ отправляет сразу — стейджим для подписи.
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

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
        setStaged({ file, kind, previewUrl: URL.createObjectURL(file) });
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

    const peerName = useMemo(
        () => peer?.nickname?.trim() || peer?.username || username || "Пользователь",
        [peer, username],
    );

    if (!isAuthenticated) {
        return <div className="status-info">Войдите, чтобы читать сообщения.</div>;
    }

    return (
        <div className="msg-page">
            <aside className="msg-list">
                <h1 className="msg-list-title">Сообщения</h1>
                <div className="msg-list-scroll">
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
                </div>
            </aside>

            <section className="msg-thread">
                {!username ? (
                    <div className="msg-thread-empty">Выберите диалог слева.</div>
                ) : (
                    <>
                        <button
                            type="button"
                            className="msg-thread-head"
                            onClick={() => navigate(`/u/${username}`)}
                        >
                            <Avatar url={peer?.avatar_url} name={peerName} size={40} />
                            <span className="msg-thread-head-text">
                                <span className="msg-thread-head-name">{peerName}</span>
                                {peer?.username && (
                                    <span className="msg-thread-head-sub">@{peer.username}</span>
                                )}
                            </span>
                        </button>

                        <div className="msg-thread-body" ref={bodyRef} onScroll={onBodyScroll}>
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
                                messages.map((m, i) => {
                                    const prev = messages[i - 1];
                                    // Разделитель дат при смене дня.
                                    const showDay =
                                        !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
                                    // Группируем подряд идущие от одного отправителя (тот же
                                    // is_mine и без разделителя даты) — плотнее и без хвоста.
                                    const grouped =
                                        !showDay &&
                                        prev &&
                                        prev.is_mine === m.is_mine &&
                                        prev.kind === "text" &&
                                        m.kind === "text";
                                    return (
                                        <div key={m.id}>
                                            {showDay && (
                                                <div className="msg-day">
                                                    <span>{dayLabel(m.created_at)}</span>
                                                </div>
                                            )}
                                            <MessageBubble
                                                message={m}
                                                grouped={!!grouped}
                                                editing={editingId === m.id}
                                                editDraft={editDraft}
                                                onEditDraft={setEditDraft}
                                                onStartEdit={() => startEdit(m)}
                                                onCancelEdit={() => setEditingId(null)}
                                                onSaveEdit={() => saveEdit(m.id)}
                                                onDelete={() => handleDelete(m.id)}
                                                onOpenMedia={() => setLightbox(m)}
                                                onOpenGift={
                                                    m.gift_instance_id
                                                        ? () => navigate(`/box/instance/${m.gift_instance_id}`)
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    );
                                })
                            )}
                            <div ref={listEndRef} />

                            {showScrollDown && (
                                <button
                                    type="button"
                                    className="msg-scroll-down"
                                    onClick={scrollToBottom}
                                    aria-label="Вниз"
                                    title="К последним сообщениям"
                                >
                                    ↓
                                </button>
                            )}
                        </div>

                        {error && <div className="msg-error">{error}</div>}

                        {/* Превью прикреплённого файла над полем ввода. */}
                        {staged && (
                            <div className="msg-staged">
                                {staged.kind === "photo" ? (
                                    <img className="msg-staged-media" src={staged.previewUrl} alt="Превью" />
                                ) : (
                                    <video className="msg-staged-media" src={staged.previewUrl} muted />
                                )}
                                <span className="msg-staged-name">{staged.file.name}</span>
                                <button
                                    type="button"
                                    className="msg-staged-remove"
                                    onClick={() => setStaged(null)}
                                    aria-label="Убрать вложение"
                                    disabled={uploadPct !== null}
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        <div className="msg-compose">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPT_ATTR}
                                hidden
                                onChange={handleFile}
                            />

                            <div className="msg-attach" ref={attachRef}>
                                <button
                                    type="button"
                                    className={`msg-compose-attach${attachMenu ? " open" : ""}`}
                                    onClick={() => setAttachMenu((v) => !v)}
                                    disabled={uploadPct !== null}
                                    title="Прикрепить"
                                    aria-label="Прикрепить"
                                    aria-haspopup="menu"
                                    aria-expanded={attachMenu}
                                >
                                    {uploadPct !== null ? `${uploadPct}%` : "＋"}
                                </button>
                                {attachMenu && (
                                    <div className="msg-attach-menu" role="menu">
                                        <button type="button" onClick={handlePickFile}>
                                            <span className="msg-attach-icon">🖼️</span>
                                            Фото или видео
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttachMenu(false);
                                                navigate("/inventory");
                                            }}
                                        >
                                            <span className="msg-attach-icon">🎁</span>
                                            Подарить коробку
                                        </button>
                                    </div>
                                )}
                            </div>

                            <textarea
                                ref={composeRef}
                                className="msg-compose-input"
                                value={draft}
                                onChange={(e) => {
                                    setDraft(e.target.value);
                                    growCompose();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={staged ? "Добавьте подпись…" : "Написать сообщение…"}
                                rows={1}
                                maxLength={4000}
                            />
                            <button
                                type="button"
                                className="msg-compose-send"
                                onClick={handleSend}
                                disabled={sending || uploadPct !== null || (!staged && !draft.trim())}
                            >
                                Отправить
                            </button>
                        </div>
                    </>
                )}
            </section>

            {lightbox?.asset_url && (
                <MessageMediaLightbox message={lightbox} onClose={() => setLightbox(null)} />
            )}
        </div>
    );
};

interface BubbleProps {
    message: MessageItem;
    grouped: boolean;
    editing: boolean;
    editDraft: string;
    onEditDraft: (v: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onDelete: () => void;
    onOpenMedia: () => void;
    onOpenGift?: () => void;
}

const MessageBubble = ({
    message: m,
    grouped,
    editing,
    editDraft,
    onEditDraft,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    onOpenMedia,
    onOpenGift,
}: BubbleProps) => {
    // Системная карточка подарка — крупная плитка с визуалом коробки.
    if (m.kind === "gift") {
        const { rarityGlow, boxColor } = resolveRarityVisual(m.gift_box_rarity ?? "common");
        return (
            <div className={`msg-gift-wrap${m.is_mine ? " mine" : ""}`}>
                <button type="button" className="msg-gift-card" onClick={onOpenGift}>
                    <span className="msg-gift-box">
                        <WireframeBox size={72} rarityGlow={rarityGlow} color={boxColor} />
                    </span>
                    <span className="msg-gift-info">
                        <span className="msg-gift-label">
                            {m.is_mine ? "Вы подарили коробку" : "Вам подарили коробку"}
                        </span>
                        {m.gift_box_title && (
                            <span className="msg-gift-title">«{m.gift_box_title}»</span>
                        )}
                        <span className="msg-gift-open">Открыть →</span>
                    </span>
                </button>
                <span className="msg-gift-time">{timeAgo(m.created_at)}</span>
            </div>
        );
    }

    const hasMedia = !!m.asset_url;
    const isPhoto = m.asset_kind === "photo";

    return (
        <div
            className={
                `msg-bubble${m.is_mine ? " mine" : ""}` +
                `${hasMedia ? " has-media" : ""}${grouped ? " grouped" : ""}`
            }
        >
            {/* Медиа отправляется вместе с сообщением — прямо в пузыре, без
                отдельной обёртки и без скругления. Клик открывает лайтбокс. */}
            {hasMedia && isPhoto && (
                <img
                    className="msg-media"
                    src={m.asset_url!}
                    alt={m.asset_name ?? "Фото"}
                    loading="lazy"
                    onClick={onOpenMedia}
                />
            )}
            {hasMedia && !isPhoto && (
                <video className="msg-media" src={m.asset_url!} controls preload="metadata" />
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
                <span className="msg-bubble-time">{clock(m.created_at)}</span>
                {m.is_mine && (
                    <span
                        className={`msg-bubble-ticks${m.is_read ? " read" : ""}`}
                        title={m.is_read ? "Прочитано" : "Отправлено"}
                        aria-hidden="true"
                    >
                        {m.is_read ? "✓✓" : "✓"}
                    </span>
                )}
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
