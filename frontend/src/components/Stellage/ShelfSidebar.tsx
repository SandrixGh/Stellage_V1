import { useMemo } from "react";
import type { Shelf } from "../../types/Stellage/shelves";
import type { Box } from "../../types/Stellage/boxes";
import { BoxFilterBar } from "./BoxFilterBar";
import "./ShelfSidebar.css";

interface ShelfSidebarProps {
    shelf: Shelf | null;
    boxes: Box[];
    searchQuery: string;
    onSearchChange: (value: string) => void;
    activeRarities: string[];
    onToggleRarity: (rarity: string) => void;
    isPublic?: boolean;
    editable?: boolean;
    isMain?: boolean;
    onMakeMain?: () => void;
}

export const ShelfSidebar = ({
    shelf,
    boxes,
    searchQuery,
    onSearchChange,
    activeRarities,
    onToggleRarity,
    isPublic,
    editable,
    isMain,
    onMakeMain,
}: ShelfSidebarProps) => {
    const { rarityCounts } = useMemo(() => {
        const counts = new Map<string, number>();
        for (const box of boxes) {
            const rarity = box.template.rarity;
            counts.set(rarity, (counts.get(rarity) ?? 0) + 1);
        }
        return { rarityCounts: counts };
    }, [boxes]);

    const rarities = useMemo(
        () => Array.from(rarityCounts.keys()).sort(),
        [rarityCounts]
    );

    const owner = shelf?.owner_username ?? "—";

    return (
        <header className="shelf-toolbar">
            <div className="shelf-toolbar-row">
                <div className="shelf-toolbar-title-group">
                    <h2 className="shelf-toolbar-title">{shelf?.title ?? "Stellage Info"}</h2>
                    <span className={`badge ${isPublic ? "badge--public" : "badge--private"}`}>
                        {isPublic ? "Публичная" : "Приватная"}
                    </span>
                    {editable && onMakeMain && !isMain && (
                        <button
                            type="button"
                            className="make-main-btn"
                            onClick={onMakeMain}
                        >
                            ★ Назначить главным
                        </button>
                    )}
                </div>

                <div className="shelf-toolbar-search">
                    <input
                        type="text"
                        className="box-filter-search shelf-compact-search"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="shelf-toolbar-filters">
                    <BoxFilterBar
                        rarities={rarities}
                        activeRarities={activeRarities}
                        onToggleRarity={onToggleRarity}
                        totalCount={boxes.length}
                        countsByRarity={Object.fromEntries(rarityCounts)}
                    />
                </div>

                <div className="shelf-toolbar-stats">
                    <span className="toolbar-stat-pill">Владелец <strong>@{owner}</strong></span>
                    <span className="dot-sep">•</span>
                    <span className="toolbar-stat-pill">Коробок <strong>{boxes.length}</strong></span>
                </div>
            </div>
        </header>
    );
};
