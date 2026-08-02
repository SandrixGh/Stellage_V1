import type { BoxSort } from "../../utils/boxFilters";
import { SORT_LABELS } from "../../utils/boxFilters";
import { rarityKey } from "../../utils/rarity";
import { Select } from "../UI/Select";
import "./BoxFilterBar.css";

const SORT_OPTIONS = (Object.keys(SORT_LABELS) as BoxSort[]).map((s) => ({
    value: s,
    label: SORT_LABELS[s],
}));

export interface BoxFilterBarProps {
    query?: string;
    onQueryChange?: (q: string) => void;
    rarities: string[];
    activeRarities: string[];
    onToggleRarity: (rarity: string) => void;
    sort?: BoxSort;
    onSortChange?: (sort: BoxSort) => void;
    searchPlaceholder?: string;
    countsByRarity?: Record<string, number>;
    totalCount?: number;
}

const RARITY_DOTS: Record<string, string> = {
    common: "#9AA0A4",
    rare: "#8BB8FF",
    golden: "#E8CB82",
    "developer's": "#C882FF",
    dev: "#C882FF",
};

function formatRarityLabel(r: string): string {
    const key = r.toLowerCase();
    if (key === "common") return "Common";
    if (key === "rare") return "Rare";
    if (key === "golden") return "Golden";
    if (key === "developer's" || key === "dev") return "Developer's";
    return r.charAt(0).toUpperCase() + r.slice(1);
}

/** Панель поиска + фильтра по редкости + сортировки. Общая для инвентаря и пикера. */
export const BoxFilterBar = ({
    query,
    onQueryChange,
    rarities,
    activeRarities,
    onToggleRarity,
    sort,
    onSortChange,
    searchPlaceholder = "Поиск по названию или #номеру...",
    countsByRarity,
    totalCount,
}: BoxFilterBarProps) => {
    const showTopRow = Boolean((onQueryChange && query !== undefined) || (onSortChange && sort !== undefined));

    return (
        <div className="box-filter-bar">
            {showTopRow && (
                <div className="box-filter-top">
                    {onQueryChange && query !== undefined && (
                        <input
                            type="text"
                            className="box-filter-search"
                            placeholder={searchPlaceholder}
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                        />
                    )}
                    {onSortChange && sort !== undefined && (
                        <Select
                            className="box-filter-sort-select"
                            value={sort}
                            options={SORT_OPTIONS}
                            onChange={(v) => onSortChange(v as BoxSort)}
                            ariaLabel="Сортировка"
                        />
                    )}
                </div>
            )}

            {rarities.length > 0 && (
                <div className="box-filter-rarities">
                    <button
                        type="button"
                        className={`box-filter-chip${activeRarities.length === 0 ? " active" : ""}`}
                        onClick={() => {
                            for (const r of activeRarities) onToggleRarity(r);
                        }}
                    >
                        Все{totalCount !== undefined ? ` (${totalCount})` : ""}
                    </button>
                    {rarities.map((r) => {
                        const active = activeRarities.includes(r);
                        const key = rarityKey(r);
                        const dotColor = RARITY_DOTS[key] || "#9AA0A4";
                        const count = countsByRarity?.[key] ?? countsByRarity?.[r];
                        return (
                            <button
                                key={r}
                                type="button"
                                className={`box-filter-chip chip-${key}${active ? " active" : ""}`}
                                onClick={() => onToggleRarity(r)}
                            >
                                <span className="box-filter-chip-dot" style={{ background: dotColor }} />
                                {formatRarityLabel(r)}{count !== undefined ? ` (${count})` : ""}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
