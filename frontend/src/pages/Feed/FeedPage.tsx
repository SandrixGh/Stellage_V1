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
    const templates = useStellageStore((s) => s.templates);
    const fetchTemplates = useStellageStore((s) => s.fetchTemplates);
    const acquireBox = useStellageStore((s) => s.acquireBox);
    const isLoading = useStellageStore((s) => s.isLoading);
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
            <div className="feed-header-section">
                <div className="feed-search-icon-wrapper">
                    <input
                        type="text"
                        className="feed-search-input"
                        placeholder="Поиск по коллекции коробок..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <svg className="feed-search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="feed-filter-chips">
                    <button
                        type="button"
                        className={`feed-chip ${activeRarities.size === 0 ? "is-active" : ""}`}
                        onClick={resetFilters}
                    >
                        Все категории
                    </button>
                    {RARITY_FILTERS.map((r) => (
                        <button
                            key={r.value}
                            type="button"
                            className={`feed-chip ${activeRarities.has(r.value) ? "is-active" : ""}`}
                            onClick={() => toggleRarity(r.value)}
                        >
                            <span className="feed-chip-dot" style={{ background: r.dot }} />
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Featured Hero Showcase (Apple App Store / Spotify hero banner) */}
            {filteredTemplates.length > 0 && !query && activeRarities.size === 0 && (
                <div className="feed-hero-banner" onClick={() => navigate(`/box/${filteredTemplates[0].id}`)}>
                    <div className="feed-hero-content">
                        <span className="feed-hero-eyebrow">Рекомендуемый релиз</span>
                        <h2 className="feed-hero-title">{filteredTemplates[0].title}</h2>
                        <p className="feed-hero-sub">Эксклюзивный цифровой контент в ограниченной серии Stellage.</p>
                        <button
                            type="button"
                            className="feed-hero-btn"
                            onClick={(e) => handleAcquire(e, filteredTemplates[0].id)}
                        >
                            Получить коробку
                        </button>
                    </div>
                </div>
            )}

            <div className="feed-content">
                {isLoading && (
                    <div className="status-info">Загрузка коллекции...</div>
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
    );
};

