import { useEffect, useMemo, useState } from "react";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import "./SearchPage.css";

export const SearchPage = () => {
    const { templates, fetchTemplates } = useStellageStore();
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (templates.length === 0) {
            fetchTemplates();
        }
    }, [templates.length, fetchTemplates]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return templates.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.description?.toLowerCase().includes(q)
        );
    }, [query, templates]);

    return (
        <div className="search-page">
            <h1 className="page-title">Поиск</h1>
            <p className="page-subtitle">Найдите коробку по названию или описанию</p>

            <div className="search-bar">
                <svg className="search-icon-svg" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Введите запрос..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
            </div>

            {query.trim() && (
                <div className="search-results">
                    {results.length > 0 ? (
                        results.map((t) => (
                            <div key={t.id} className="search-result-item">
                                <div className="search-result-box-icon">
                                    <WireframeBox size={44} />
                                </div>
                                <div className="search-result-info">
                                    <span className="search-result-title">{t.title}</span>
                                    {t.description && (
                                        <span className="search-result-desc">{t.description}</span>
                                    )}
                                </div>
                                <span className={`search-result-rarity rarity-${t.rarity?.toLowerCase()}`}>
                                    {t.rarity}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="empty-message">Ничего не найдено по запросу «{query}».</p>
                    )}
                </div>
            )}
        </div>
    );
};
