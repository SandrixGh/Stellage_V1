import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Shelf } from "../../types/Stellage/shelves";
import type { Box } from "../../types/Stellage/boxes";
import { ShelfSidebar } from "./ShelfSidebar";
import { ShelfBoard } from "./ShelfBoard";
import { useStudyStore } from "../../store/useStudyStore";
import "./ShelfView.css";

interface ShelfViewProps {
    shelf: Shelf | null;
    /** Доступно ли перетаскивание (своя полка) или это публичный read-only вид. */
    editable: boolean;
    onMove?: (id: string, row: number, col: number) => void;
    /** Открыть коробку по клику (просмотр контента/информации). */
    onOpen?: (box: Box) => void;
    /** Правая колонка (например, список стеллажей с кнопкой создания). */
    rightPanel?: ReactNode;
    /** Является ли открытая полка главной (для кнопки «назначить главным»). */
    isMain?: boolean;
    onMakeMain?: () => void;
}

export const ShelfView = ({ shelf, editable, onMove, onOpen, rightPanel, isMain, onMakeMain }: ShelfViewProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeRarities, setActiveRarities] = useState<string[]>([]);
    const { studyModeEnabled, gridLabelsVisible, rowLabels, colLabels, cellStatuses } = useStudyStore();

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
            // Серийный номер — точное совпадение (с опц. префиксом «#»), а не подстрока.
            const serialQuery = q.replace(/^#/, "");
            const serialMatch =
                /^\d+$/.test(serialQuery) && String(box.serial_number) === serialQuery;
            return title.includes(q) || serialMatch;
        });
    }, [allBoxes, searchQuery, activeRarities]);

    const studyLabelsProp = useMemo(() => {
        if (!studyModeEnabled || !gridLabelsVisible) return undefined;
        return {
            rowLabels,
            colLabels,
            cellStatuses,
        };
    }, [studyModeEnabled, gridLabelsVisible, rowLabels, colLabels, cellStatuses]);

    return (
        <div className="shelf-view">
            <div className="shelf-view-main">
                <ShelfSidebar
                    shelf={shelf}
                    boxes={allBoxes}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    activeRarities={activeRarities}
                    onToggleRarity={toggleRarity}
                    isPublic={shelf?.is_public ?? false}
                    editable={editable}
                    isMain={isMain}
                    onMakeMain={onMakeMain}
                />
                <div className="shelf-view-board">
                    <ShelfBoard
                        boxes={filteredBoxes}
                        editable={editable}
                        onMove={onMove}
                        onOpen={onOpen}
                        studyLabels={studyLabelsProp}
                    />
                </div>
            </div>
            {rightPanel && <div className="shelf-view-rail">{rightPanel}</div>}
        </div>
    );
};

