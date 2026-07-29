import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { BoxCard } from "../../components/Stellage/BoxCard";
import { BoxFilterBar } from "../../components/Stellage/BoxFilterBar";
import { BoxDetailModal } from "../Box/BoxDetailModal";
import { filterBoxes, collectRarities, type BoxSort } from "../../utils/boxFilters";
import type { Box } from "../../types/Stellage/boxes";
import "./InventoryPage.css";

export const InventoryPage = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const instances = useStellageStore((s) => s.instances);
    const fetchInstances = useStellageStore((s) => s.fetchInstances);

    const [query, setQuery] = useState("");
    const [activeRarities, setActiveRarities] = useState<string[]>([]);
    const [sort, setSort] = useState<BoxSort>("date_desc");
    const [openedBox, setOpenedBox] = useState<Box | null>(null);

    useEffect(() => {
        if (isAuthenticated) fetchInstances();
    }, [isAuthenticated, fetchInstances]);


    const rarities = useMemo(() => collectRarities(instances), [instances]);
    const visible = useMemo(
        () => filterBoxes(instances, { query, rarities: activeRarities, sort }),
        [instances, query, activeRarities, sort]
    );

    const toggleRarity = (r: string) =>
        setActiveRarities((prev) =>
            prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
        );

    if (!isAuthenticated) {
        return (
            <div className="inventory-gate">
                <div className="inventory-gate-visual">
                    <WireframeBox size={240} />
                </div>
                <div className="inventory-gate-content">
                    <h1 className="inventory-gate-title">Инвентарь</h1>
                    <p className="inventory-gate-sub">
                        Войдите, чтобы увидеть свои коробки.
                    </p>
                    <Link to="/login" className="inventory-gate-btn">Войти</Link>
                </div>
            </div>
        );
    }

    return (
        <section className="inventory-page">
            <header className="inventory-header">
                <div>
                    <h1 className="inventory-title">Инвентарь</h1>
                    <p className="inventory-sub">
                        Все твои коробки — {instances.length} шт.
                    </p>
                </div>
                <Link to="/create-box" className="inventory-create-btn">
                    + Создать коробку
                </Link>
            </header>

            <BoxFilterBar
                query={query}
                onQueryChange={setQuery}
                rarities={rarities}
                activeRarities={activeRarities}
                onToggleRarity={toggleRarity}
                sort={sort}
                onSortChange={setSort}
            />

            {visible.length > 0 ? (
                <div className="inventory-grid">
                    {visible.map((box) => (
                        <button
                            key={box.id}
                            type="button"
                            className="inventory-card-btn"
                            onClick={() => setOpenedBox(box)}
                        >
                            <BoxCard box={box} />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="inventory-empty">
                    {instances.length === 0
                        ? "В инвентаре пока нет коробок. Создай первую!"
                        : "Ничего не найдено по заданным фильтрам."}
                </div>
            )}

            <BoxDetailModal box={openedBox} onClose={() => setOpenedBox(null)} />
        </section>
    );
};
