import { useEffect, useRef, useState } from "react";
import { api } from "../../api/instance";
import { Avatar } from "./Avatar";
import type { PublicUser } from "../../types/Profile/profile";
import "./UserPicker.css";

interface UserPickerProps {
    /** Выбранный получатель (или null). */
    value: PublicUser | null;
    onSelect: (user: PublicUser | null) => void;
    placeholder?: string;
    /** Не показывать в результатах — например себя. */
    excludeUserId?: string;
    autoFocus?: boolean;
}

/**
 * Поиск и выбор пользователя по нику ИЛИ юзернейму (дебаунс-запрос к
 * /profile/search, который ищет и по username, и по nickname). Пришёл на смену
 * «слепому» вводу username: теперь можно найти человека по отображаемому имени,
 * а в действие уходит его настоящий username.
 */
export const UserPicker = ({
    value,
    onSelect,
    placeholder = "Имя или @юзернейм…",
    excludeUserId,
    autoFocus,
}: UserPickerProps) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PublicUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query.trim();
        if (!q) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const handle = setTimeout(async () => {
            try {
                const res = await api.get<PublicUser[]>("/profile/search", {
                    params: { q },
                });
                setResults(res.data.filter((u) => u.id !== excludeUserId && u.username));
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(handle);
    }, [query, excludeUserId]);

    // Клик вне — закрыть выпадашку.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const pick = (u: PublicUser) => {
        onSelect(u);
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    // Уже выбран получатель — показываем компактную «чипсу» с кнопкой сброса.
    if (value) {
        const title = value.nickname?.trim() || value.username || "Без имени";
        return (
            <div className="user-picker-chosen">
                <Avatar url={value.avatar_url} name={title} size={32} />
                <span className="user-picker-chosen-text">
                    <span className="user-picker-chosen-name">{title}</span>
                    {value.username && (
                        <span className="user-picker-chosen-sub">@{value.username}</span>
                    )}
                </span>
                <button
                    type="button"
                    className="user-picker-clear"
                    aria-label="Сбросить получателя"
                    onClick={() => onSelect(null)}
                >
                    ×
                </button>
            </div>
        );
    }

    return (
        <div className="user-picker" ref={rootRef}>
            <input
                type="text"
                className="user-picker-input"
                placeholder={placeholder}
                value={query}
                autoFocus={autoFocus}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
            />
            {open && query.trim() && (
                <div className="user-picker-dropdown">
                    {loading ? (
                        <div className="user-picker-empty">Ищем…</div>
                    ) : results.length > 0 ? (
                        results.map((u) => {
                            const title = u.nickname?.trim() || u.username || "Без имени";
                            return (
                                <button
                                    key={u.id}
                                    type="button"
                                    className="user-picker-item"
                                    onClick={() => pick(u)}
                                >
                                    <Avatar url={u.avatar_url} name={title} size={32} />
                                    <span className="user-picker-item-text">
                                        <span className="user-picker-item-name">{title}</span>
                                        {u.username && (
                                            <span className="user-picker-item-sub">
                                                @{u.username}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })
                    ) : (
                        <div className="user-picker-empty">Никого не найдено</div>
                    )}
                </div>
            )}
        </div>
    );
};
