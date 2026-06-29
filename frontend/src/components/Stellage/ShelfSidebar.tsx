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
}: ShelfSidebarProps) => {
    // Группируем по редкости и считаем общую стоимость за один проход.
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
        <aside className="shelf-sidebar">
            <h2 className="shelf-sidebar-title">Stellage Info</h2>

            <dl className="shelf-stats">
                <div className="shelf-stat-row">
                    <dt>Владелец</dt>
                    <dd>{owner}</dd>
                </div>
                <div className="shelf-stat-row">
                    <dt>Кол-во коробок</dt>
                    <dd>{boxes.length}</dd>
                </div>
                <div className="shelf-stat-row">
                    <dt>Цена стеллажа</dt>
                    <dd>
                        {formatPrice(totalPrice)}
                        {currency ? ` ${currency}` : ""}
                    </dd>
                </div>
            </dl>

            {rarities.length > 0 && (
                <div className="shelf-section">
                    <h3 className="shelf-section-title">По редкости</h3>
                    <ul className="shelf-rarity-list">
                        {rarities.map((rarity) => (
                            <li key={rarity} className="shelf-rarity-row">
                                <span className="shelf-rarity-name">{rarity}</span>
                                <span className="shelf-rarity-count">
                                    {rarityCounts.get(rarity)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="shelf-section">
                <h3 className="shelf-section-title">Поиск коробки</h3>
                <input
                    type="text"
                    className="shelf-search"
                    placeholder="Название или серийный номер…"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {rarities.length > 0 && (
                <div className="shelf-section">
                    <h3 className="shelf-section-title">Фильтр по редкости</h3>
                    <div className="shelf-rarity-chips">
                        {rarities.map((rarity) => {
                            const active = activeRarities.includes(rarity);
                            return (
                                <button
                                    key={rarity}
                                    type="button"
                                    className={`shelf-chip ${active ? "is-active" : ""}`}
                                    aria-pressed={active}
                                    onClick={() => onToggleRarity(rarity)}
                                >
                                    {rarity}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </aside>
    );
};
