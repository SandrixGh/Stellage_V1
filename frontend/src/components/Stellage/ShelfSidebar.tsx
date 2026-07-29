import { useMemo } from "react";
import type { Shelf } from "../../types/Stellage/shelves";
import type { Box } from "../../types/Stellage/boxes";
import "./ShelfSidebar.css";

interface ShelfSidebarProps {
    shelf: Shelf | null;
    /** Полный (нефильтрованный) список коробок — для статистики. */
    boxes: Box[];
    searchQuery: string;
    onSearchChange: (value: string) => void;
    /** Активные фильтры по редкости (пустой набор = показывать все). */
    activeRarities: string[];
    onToggleRarity: (rarity: string) => void;
    isPublic?: boolean;
    editable?: boolean;
    /** Является ли полка главной (тогда кнопку «назначить главным» не показываем). */
    isMain?: boolean;
    onMakeMain?: () => void;
}

/** Аккуратное форматирование суммы цены полки. */
function formatPrice(total: number): string {
    if (!Number.isFinite(total)) return "0";
    return Number.isInteger(total) ? String(total) : total.toFixed(2);
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
    const { rarityCounts, totalPrice, currency } = useMemo(() => {
        const counts = new Map<string, number>();
        let price = 0;
        let cur = "";
        for (const box of boxes) {
            const rarity = box.template.rarity;
            counts.set(rarity, (counts.get(rarity) ?? 0) + 1);
            const p = Number(box.template.price);
            if (Number.isFinite(p)) price += p;
            if (!cur && box.template.currency) cur = box.template.currency;
        }
        return { rarityCounts: counts, totalPrice: price, currency: cur };
    }, [boxes]);

    const rarities = useMemo(
        () => Array.from(rarityCounts.keys()).sort(),
        [rarityCounts]
    );

    const owner = shelf?.owner_username ?? "—";

    return (

        <header className="shelf-toolbar glass-panel">
            <div className="shelf-toolbar-top">
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

                <div className="shelf-toolbar-stats">
                    <span className="toolbar-stat-pill">Владелец: <strong>@{owner}</strong></span>
                    <span className="toolbar-stat-pill">Коробок: <strong>{boxes.length}</strong></span>
                    {totalPrice > 0 && (
                        <span className="toolbar-stat-pill">Ценность: <strong>{formatPrice(totalPrice)} {currency}</strong></span>
                    )}
                </div>
            </div>

            <div className="shelf-toolbar-bottom">
                <div className="shelf-search-wrapper">
                    <input
                        type="text"
                        className="shelf-search-input"
                        placeholder="Поиск коробки по имени или #номеру…"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {rarities.length > 0 && (
                    <div className="shelf-filter-chips">
                        <button
                            type="button"
                            className={`shelf-chip ${activeRarities.length === 0 ? "is-active" : ""}`}
                            onClick={() => {
                                for (const r of activeRarities) onToggleRarity(r);
                            }}
                        >
                            Все ({boxes.length})
                        </button>
                        {rarities.map((rarity) => {
                            const active = activeRarities.includes(rarity);
                            const count = rarityCounts.get(rarity);
                            return (
                                <button
                                    key={rarity}
                                    type="button"
                                    className={`shelf-chip ${active ? "is-active" : ""}`}
                                    onClick={() => onToggleRarity(rarity)}
                                >
                                    {rarity} ({count})
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </header>
    );
};

