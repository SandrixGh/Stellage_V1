import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStellageStore } from "../../store/useStellageStore";
import { useAuthStore } from "../../store/useAuthStore";
import { TemplateCard } from "../../components/Stellage/TemplateCard";
import "./FeedPage.css";

/* ── Rarity filter definitions (label + matching value + dot color) ── */
const RARITY_FILTERS: { label: string; value: string; dot: string }[] = [
    { label: "Common", value: "common", dot: "#9AA0A4" },
    { label: "Rare", value: "rare", dot: "#8BB8FF" },
    { label: "Golden", value: "golden", dot: "#E8CB82" },
    { label: "Developer's", value: "developer's", dot: "#C882FF" },
];

export const FeedPage = () => {
    const navigate = useNavigate();
    const { templates, fetchTemplates, acquireBox, isLoading } = useStellageStore();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [query, setQuery] = useState("");
    const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const toggleRarity = (value: string) => {
        setActiveRarities((prev) => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    };

    const resetFilters = () => {
        setQuery("");
        setActiveRarities(new Set());
    };

    const filteredTemplates = useMemo(() => {
        const q = query.trim().toLowerCase();
        return templates.filter((tpl) => {
            const matchesQuery =
                q === "" || tpl.title.toLowerCase().includes(q);
            const matchesRarity =
                activeRarities.size === 0 ||
                activeRarities.has((tpl.rarity ?? "").toLowerCase());
            return matchesQuery && matchesRarity;
        });
    }, [templates, query, activeRarities]);

    const handleAcquire = async (e: React.MouseEvent, templateId: string) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            navigate("/auth");
            return;
        }
        await acquireBox(templateId);
        // Optionally show a toast or change button state, but for now it'll just acquire it silently or show an error via store
        navigate("/inventory");
    };

    return (
        <div className="feed-page">
            <div className="feed-search">
                <input
                    type="text"
                    className="feed-search-input"
                    placeholder="Поиск коробок..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div className="feed-layout">
                <aside className="feed-sidebar">
                    <h2 className="feed-sidebar-title">Фильтры</h2>

                    <div className="feed-filter-group">
                        {RARITY_FILTERS.map((r) => (
                            <label
                                key={r.value}
                                className={`feed-filter-option${
                                    activeRarities.has(r.value) ? " is-active" : ""
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={activeRarities.has(r.value)}
                                    onChange={() => toggleRarity(r.value)}
                                />
                                <span
                                    className="feed-filter-dot"
                                    style={{ background: r.dot }}
                                />
                                <span className="feed-filter-label">{r.label}</span>
                            </label>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="feed-reset-button"
                        onClick={resetFilters}
                    >
                        Сбросить
                    </button>
                </aside>

                <div className="feed-content">
                    {isLoading && (
                        <div className="status-info">Загрузка ленты...</div>
                    )}

                    {!isLoading && (
                        <div className="feed-grid">
                            {filteredTemplates.length > 0 ? (
                                filteredTemplates.map((tpl) => (
                                        <TemplateCard
                                            key={tpl.id}
                                            template={tpl}
                                            onClick={() => navigate(`/box/${tpl.id}`)}
                                            actionNode={
                                                <button
                                                    className="feed-acquire-button"
                                                    onClick={(e) => handleAcquire(e, tpl.id)}
                                                >
                                                    Получить
                                                </button>
                                            }
                                        />
                                ))
                            ) : (
                                <p className="empty-message">
                                    Коробок не найдено.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
