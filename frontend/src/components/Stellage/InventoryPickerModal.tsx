import { useEffect, useMemo, useState } from "react";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { BoxFilterBar } from "./BoxFilterBar";
import { rarityKey } from "../../utils/rarity";
import { resolveRarityVisual } from "../../data/mockTemplates";
import { filterBoxes, collectRarities, type BoxSort } from "../../utils/boxFilters";
import "./InventoryPickerModal.css";

interface InventoryPickerModalProps {
    /** Коробки инвентаря, доступные для постановки (shelf_id === null). */
    boxes: Box[];
    onPick: (instanceId: string) => void;
    onClose: () => void;
    disabled?: boolean;
}

/** Модалка «Добавить коробку на полку»: поиск + фильтр по редкости + сортировка. */
export const InventoryPickerModal = ({ boxes, onPick, onClose, disabled }: InventoryPickerModalProps) => {
    const [query, setQuery] = useState("");
    const [activeRarities, setActiveRarities] = useState<string[]>([]);
    const [sort, setSort] = useState<BoxSort>("date_desc");

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const rarities = useMemo(() => collectRarities(boxes), [boxes]);
    const visible = useMemo(
        () => filterBoxes(boxes, { query, rarities: activeRarities, sort }),
        [boxes, query, activeRarities, sort]
    );

    const toggleRarity = (r: string) =>
        setActiveRarities((prev) =>
            prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
        );

    return (
        <div className="picker-overlay" onClick={onClose}>
            <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
                <div className="picker-head">
                    <h2 className="picker-title">Добавить коробку</h2>
                    <button type="button" className="picker-close" aria-label="Закрыть" onClick={onClose}>✕</button>
                </div>
                <p className="picker-hint">Выбери коробку из инвентаря, чтобы поставить её на стеллаж.</p>

                <BoxFilterBar
                    query={query}
                    onQueryChange={setQuery}
                    rarities={rarities}
                    activeRarities={activeRarities}
                    onToggleRarity={toggleRarity}
                    sort={sort}
                    onSortChange={setSort}
                />

                <div className="picker-body">
                {visible.length > 0 ? (
                    <div className="picker-grid">
                        {visible.map((box) => {
                            const key = rarityKey(box.template.rarity);
                            const { rarityGlow, boxColor } = resolveRarityVisual(box.template.rarity ?? "common");
                            return (
                                <button
                                    key={box.id}
                                    type="button"
                                    className="picker-item"
                                    onClick={() => onPick(box.id)}
                                    disabled={disabled}
                                    title="Поставить на полку"
                                >
                                    <div className="picker-item-visual">
                                        <WireframeBox size={72} rarityGlow={rarityGlow} color={boxColor} />
                                    </div>
                                    <span className="picker-item-name">{box.template.title}</span>
                                    <span className={`picker-item-rarity rarity-tag-${key}`}>
                                        {box.template.rarity}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="picker-empty">
                        {boxes.length === 0
                            ? "В инвентаре нет свободных коробок. Создай новую на странице «Создать коробку»."
                            : "Ничего не найдено по заданным фильтрам."}
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};
