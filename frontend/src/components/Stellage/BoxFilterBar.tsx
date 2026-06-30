import type { BoxSort } from "../../utils/boxFilters";
import { SORT_LABELS } from "../../utils/boxFilters";
import { rarityKey } from "../../utils/rarity";
import { Select } from "../UI/Select";
import "./BoxFilterBar.css";

const SORT_OPTIONS = (Object.keys(SORT_LABELS) as BoxSort[]).map((s) => ({
    value: s,
    label: SORT_LABELS[s],
}));

interface BoxFilterBarProps {
    query: string;
    onQueryChange: (q: string) => void;
    rarities: string[];
    activeRarities: string[];
    onToggleRarity: (rarity: string) => void;
    sort: BoxSort;
    onSortChange: (sort: BoxSort) => void;
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
}: BoxFilterBarProps) => {
    return (
        <div className="box-filter-bar">
            <div className="box-filter-top">
                <input
                    type="text"
                    className="box-filter-search"
                    placeholder="Поиск по названию или #номеру"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                />
                <Select
                    className="box-filter-sort-select"
                    value={sort}
                    options={SORT_OPTIONS}
                    onChange={(v) => onSortChange(v as BoxSort)}
                    ariaLabel="Сортировка"
                />
            </div>

            {rarities.length > 0 && (
                <div className="box-filter-rarities">
                    {rarities.map((r) => {
                        const active = activeRarities.includes(r);
                        return (
                            <button
                                key={r}
                                type="button"
                                className={`box-filter-chip rarity-tag-${rarityKey(r)}${active ? " active" : ""}`}
                                onClick={() => onToggleRarity(r)}
                            >
                                {r}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
