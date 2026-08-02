import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStellageStore } from "../../store/useStellageStore";
import { useAuthStore } from "../../store/useAuthStore";
import { TemplateCard } from "../../components/Stellage/TemplateCard";
import { BuyBoxModal } from "../../components/Stellage/BuyBoxModal";
import { BoxFilterBar } from "../../components/Stellage/BoxFilterBar";
import type { BoxTemplate } from "../../types/Stellage/boxes";
import type { BoxSort } from "../../utils/boxFilters";
import "./FeedPage.css";

export const FeedPage = () => {
    const navigate = useNavigate();
    const { templates, fetchTemplates, isLoading } = useStellageStore();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [query, setQuery] = useState("");
    const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<BoxSort>("date_desc");
    const [selectedTemplateForBuy, setSelectedTemplateForBuy] = useState<BoxTemplate | null>(null);

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

    const filteredTemplates = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = templates.filter((tpl) => {
            const matchesQuery =
                q === "" ||
                tpl.title.toLowerCase().includes(q) ||
                (tpl.description ?? "").toLowerCase().includes(q);
            const matchesRarity =
                activeRarities.size === 0 ||
                activeRarities.has((tpl.rarity ?? "").toLowerCase());
            return matchesQuery && matchesRarity;
        });

        list = [...list].sort((a, b) => {
            if (sortBy === "price_asc") {
                return Number(a.price) - Number(b.price);
            }
            if (sortBy === "price_desc") {
                return Number(b.price) - Number(a.price);
            }
            if (sortBy === "date_asc") {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return list;
    }, [templates, query, activeRarities, sortBy]);

    const handleAcquireClick = (template: BoxTemplate) => {
        if (!isAuthenticated) {
            navigate("/auth");
            return;
        }
        setSelectedTemplateForBuy(template);
    };

    return (
        <div className="feed-page">
            <BoxFilterBar
                query={query}
                onQueryChange={setQuery}
                rarities={["common", "rare", "golden", "developer's"]}
                activeRarities={Array.from(activeRarities)}
                onToggleRarity={toggleRarity}
                sort={sortBy}
                onSortChange={setSortBy}
                searchPlaceholder="Поиск по коллекции коробок..."
            />

            {/* ── Feed Grid Content ── */}
            <div className="feed-content">
                {isLoading ? (
                    <div className="status-info">Загрузка коллекции...</div>
                ) : filteredTemplates.length > 0 ? (
                    <div className="feed-grid">
                        {filteredTemplates.map((tpl) => (
                            <TemplateCard
                                key={tpl.id}
                                template={tpl}
                                onClick={() => navigate(`/box/${tpl.id}`)}
                                onAcquireClick={handleAcquireClick}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="empty-message">
                        Коробок по данному запросу не найдено.
                    </div>
                )}
            </div>

            {/* ── StellaCoin Buy Modal ── */}
            {selectedTemplateForBuy && (
                <BuyBoxModal
                    template={selectedTemplateForBuy}
                    onClose={() => setSelectedTemplateForBuy(null)}
                />
            )}
        </div>
    );
};
