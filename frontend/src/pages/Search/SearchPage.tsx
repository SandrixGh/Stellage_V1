import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/instance";
import { Avatar } from "../../components/UI/Avatar";
import { onlineStatus, isOnline } from "../../utils/onlineStatus";
import type { PublicUser } from "../../types/Profile/profile";
import "./SearchPage.css";

export const SearchPage = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PublicUser[]>([]);
    const [loading, setLoading] = useState(false);

    // Дебаунсим запрос, чтобы не дёргать бэкенд на каждый символ.
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
                setResults(res.data);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(handle);
    }, [query]);

    return (
        <div className="search-page">
            <h1 className="page-title">Поиск</h1>

            <div className="search-bar">
                <svg className="search-icon-svg" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Имя или @юзернейм..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
            </div>

            {query.trim() && (
                <div className="search-results">
                    {loading ? (
                        <p className="empty-message">Ищем…</p>
                    ) : results.length > 0 ? (
                        results.map((u) => {
                            const title = u.nickname?.trim() || u.username || "Без имени";
                            const online = isOnline(u.last_seen_at ?? undefined);
                            const inner = (
                                <>
                                    <Avatar url={u.avatar_url} name={title} size={44} />
                                    <div className="search-result-info">
                                        <span className="search-result-title">{title}</span>
                                        {u.username && (
                                            <span className="search-result-desc">@{u.username}</span>
                                        )}
                                    </div>
                                    <span className={`search-result-status${online ? " is-online" : ""}`}>
                                        {onlineStatus(u.last_seen_at ?? undefined)}
                                    </span>
                                </>
                            );

                            return u.username ? (
                                <Link
                                    key={u.id}
                                    to={`/u/${u.username}`}
                                    className="search-result-item"
                                >
                                    {inner}
                                </Link>
                            ) : (
                                <div key={u.id} className="search-result-item">
                                    {inner}
                                </div>
                            );
                        })
                    ) : (
                        <p className="empty-message">Никого не найдено по запросу «{query}».</p>
                    )}
                </div>
            )}
        </div>
    );
};
