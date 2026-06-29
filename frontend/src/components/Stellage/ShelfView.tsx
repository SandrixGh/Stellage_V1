import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Shelf } from "../../types/Stellage/shelves";
import type { Box } from "../../types/Stellage/boxes";
import { ShelfSidebar } from "./ShelfSidebar";
import { ShelfBoard } from "./ShelfBoard";
import "./ShelfView.css";

interface ShelfViewProps {
    shelf: Shelf | null;
    /** Доступно ли перетаскивание (своя полка) или это публичный read-only вид. */
    editable: boolean;
    onMove?: (id: string, row: number, col: number) => void;
    /** Правая колонка (например, список стеллажей с кнопкой создания). */
    rightPanel?: ReactNode;
}

/**
 * Композиция «боковая панель + доска»: держит состояние поиска и фильтра по
 * редкости, считает отфильтрованный список коробок и передаёт его в ShelfBoard.
 * Боковая панель при этом получает ПОЛНЫЙ список коробок для статистики.
 */
export const ShelfView = ({ shelf, editable, onMove, rightPanel }: ShelfViewProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeRarities, setActiveRarities] = useState<string[]>([]);

    const allBoxes = shelf?.boxes ?? [];

    const toggleRarity = (rarity: string) => {
        setActiveRarities((prev) =>
            prev.includes(rarity)
                ? prev.filter((r) => r !== rarity)
                : [...prev, rarity]
        );
    };

    const filteredBoxes = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return allBoxes.filter((box: Box) => {
            const matchesRarity =
                activeRarities.length === 0 ||
                activeRarities.includes(box.template.rarity);
            if (!matchesRarity) return false;

            if (!q) return true;
            const title = box.template.title?.toLowerCase() ?? "";
            const serial = String(box.serial_number);
            return title.includes(q) || serial.includes(q);
        });
    }, [allBoxes, searchQuery, activeRarities]);

    return (
        <div className="shelf-view">
            <ShelfSidebar
                shelf={shelf}
                boxes={allBoxes}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeRarities={activeRarities}
                onToggleRarity={toggleRarity}
                isPublic={shelf?.is_public ?? false}
                editable={editable}
            />
            <div className="shelf-view-board">
                <ShelfBoard
                    boxes={filteredBoxes}
                    editable={editable}
                    onMove={onMove}
                />
            </div>
            {rightPanel && <div className="shelf-view-rail">{rightPanel}</div>}
        </div>
    );
};
