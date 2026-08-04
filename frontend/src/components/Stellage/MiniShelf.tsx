import { useMemo } from "react";
import { WireframeBox } from "./WireframeBox";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import type { Box } from "../../types/Stellage/boxes";
import "./MiniShelf.css";

interface MiniShelfProps {
    boxes: Box[];
    /** Число колонок сетки полки (как на большом стеллаже). */
    cols?: number;
    /** Высота одной полки в px (гомотетия: меньше — компактнее). */
    rowHeight?: number;
    /** Размер коробки в px. */
    boxSize?: number;
}

interface Placed {
    box: Box;
    row: number;
    col: number;
}

/**
 * Уменьшённая гомотетичная копия стеллажа: линии-полки + коробки на них, как на
 * большом ShelfBoard, но без бирок, drag и подписей — только «как это выглядит».
 * Коробки стоят по своим shelf_row/shelf_col; те, у кого координат нет, кладутся
 * в первую свободную ячейку. Для превью в попапе собеседника.
 */
export const MiniShelf = ({
    boxes,
    cols = 8,
    rowHeight = 46,
    boxSize = 34,
}: MiniShelfProps) => {
    const placed = useMemo(() => placeBoxes(boxes, cols), [boxes, cols]);
    // Число полок — по максимальной занятой строке (минимум 2 для вида «стеллажа»).
    const rows = Math.max(2, ...placed.map((p) => p.row + 1), 0);
    const cellWidthPct = 100 / cols;

    return (
        <div
            className="mini-shelf"
            style={{ height: rows * rowHeight + 8 }}
            aria-hidden="true"
        >
            {Array.from({ length: rows }).map((_, row) => (
                <div
                    key={`line-${row}`}
                    className="mini-shelf-line"
                    style={{ top: (row + 1) * rowHeight - 1 }}
                />
            ))}
            {placed.map((p) => {
                const { rarityGlow, boxColor } = resolveRarityVisual(
                    p.box.template.rarity ?? "common",
                );
                return (
                    <div
                        key={p.box.id}
                        className="mini-shelf-cell"
                        style={{
                            left: `${p.col * cellWidthPct}%`,
                            top: p.row * rowHeight,
                            width: `${cellWidthPct}%`,
                            height: rowHeight,
                        }}
                    >
                        <WireframeBox
                            size={boxSize}
                            rarityGlow={rarityGlow}
                            color={boxColor}
                            contentType={resolveBoxContentType(p.box)}
                            coverUrl={(p.box as any).cover_url || (p.box as any).preview_url || null}
                        />
                    </div>
                );
            })}
        </div>
    );
};

/** Раскладка коробок по сетке: по своим координатам, остальные — row-major. */
function placeBoxes(boxes: Box[], cols: number): Placed[] {
    const taken = new Set<string>();
    const result: Placed[] = [];
    const leftovers: Box[] = [];

    for (const box of boxes) {
        const { shelf_row: r, shelf_col: c } = box;
        if (r !== null && c !== null && c < cols) {
            const key = `${r}:${c}`;
            if (!taken.has(key)) {
                taken.add(key);
                result.push({ box, row: r, col: c });
                continue;
            }
        }
        leftovers.push(box);
    }

    let cursor = 0;
    for (const box of leftovers) {
        // Первая свободная ячейка row-major.
        while (taken.has(`${Math.floor(cursor / cols)}:${cursor % cols}`)) cursor++;
        const row = Math.floor(cursor / cols);
        const col = cursor % cols;
        taken.add(`${row}:${col}`);
        result.push({ box, row, col });
        cursor++;
    }
    return result;
}
