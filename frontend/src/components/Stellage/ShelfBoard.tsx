import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import "./ShelfBoard.css";

/** Сопоставление редкости коробки с цветом свечения wireframe. */
const rarityGlowMap: Record<string, "rare" | "golden" | "dev" | null> = {
    rare: "rare",
    golden: "golden",
    "developer's": "dev",
    dev: "dev",
};

interface ShelfBoardProps {
    boxes: Box[];
    editable: boolean;
    rowCount?: number;
    colCount?: number;
    onMove?: (id: string, row: number, col: number) => void;
    /** Открыть коробку (клик без перетаскивания). Работает и на read-only полке. */
    onOpen?: (box: Box) => void;
}

interface PlacedBox {
    box: Box;
    row: number;
    col: number;
}

/** Высота одной полки в пикселях (включает зону для коробки + полку под ней). */
const ROW_HEIGHT = 128;

/** Запас под последней линией, чтобы бирка нижнего ряда не обрезалась
 * (оставляем 3–4px от нижней бирки до края канваса). */
const LABEL_SPACE = 50;

/** Порог смещения курсора (px), после которого жест считается перетаскиванием,
 * а не кликом-открытием коробки. */
const DRAG_THRESHOLD = 5;

const cellKey = (row: number, col: number) => `${row}:${col}`;

/**
 * Детерминированно раскладывает коробки по дискретной сетке rowCount x colCount.
 * Коробки с корректными координатами занимают свои ячейки; коробки с null /
 * выходящими за пределы / конфликтующими координатами получают первую свободную
 * ячейку в порядке row-major. Гарантирует, что две коробки не делят ячейку.
 */
export function placeBoxes(boxes: Box[], rowCount: number, colCount: number): PlacedBox[] {
    const occupied = new Set<string>();
    const placed: PlacedBox[] = [];
    const needsCell: Box[] = [];

    const inRange = (row: number | null, col: number | null): row is number =>
        row !== null && col !== null &&
        Number.isInteger(row) && Number.isInteger(col) &&
        row >= 0 && row < rowCount && col >= 0 && col < colCount;

    for (const box of boxes) {
        const { shelf_row, shelf_col } = box;
        if (inRange(shelf_row, shelf_col)) {
            const key = cellKey(shelf_row, shelf_col as number);
            if (!occupied.has(key)) {
                occupied.add(key);
                placed.push({ box, row: shelf_row, col: shelf_col as number });
                continue;
            }
        }
        // Координат нет / вне сетки / конфликт — поставим в первую свободную ячейку.
        needsCell.push(box);
    }

    if (needsCell.length > 0) {
        const free: { row: number; col: number }[] = [];
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col < colCount; col++) {
                if (!occupied.has(cellKey(row, col))) free.push({ row, col });
            }
        }
        for (const box of needsCell) {
            const slot = free.shift();
            if (!slot) break; // Сетка переполнена — лишние коробки не показываем.
            occupied.add(cellKey(slot.row, slot.col));
            placed.push({ box, row: slot.row, col: slot.col });
        }
    }

    return placed;
}

interface DragState {
    id: string;
    pointerId: number;
    // Смещение курсора относительно левого-верхнего угла перетаскиваемой коробки.
    grabDx: number;
    grabDy: number;
    // Текущая позиция курсора в координатах доски.
    x: number;
    y: number;
    // Точка нажатия (для отличения клика от перетаскивания).
    startX: number;
    startY: number;
    // Сдвинулся ли курсор дальше порога — тогда это перетаскивание, а не клик.
    moved: boolean;
}

export const ShelfBoard = ({
    boxes,
    editable,
    rowCount = 5,
    colCount = 8,
    onMove,
    onOpen,
}: ShelfBoardProps) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    // Ширина ячейки в пикселях — нужна для центрирования коробки под курсором.
    const [cellWidth, setCellWidth] = useState(0);

    const placed = useMemo(
        () => placeBoxes(boxes, rowCount, colCount),
        [boxes, rowCount, colCount]
    );

    useLayoutEffect(() => {
        const measure = () => {
            const el = boardRef.current;
            if (el) setCellWidth(el.clientWidth / colCount);
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [colCount]);

    const cellWidthPct = 100 / colCount;

    const pointToCell = useCallback(
        (clientX: number, clientY: number) => {
            const el = boardRef.current;
            if (!el) return { row: 0, col: 0 };
            const rect = el.getBoundingClientRect();
            const localX = clientX - rect.left;
            const localY = clientY - rect.top;
            const colW = rect.width / colCount;
            let col = Math.round((localX - colW / 2) / colW);
            let row = Math.round((localY - ROW_HEIGHT / 2) / ROW_HEIGHT);
            col = Math.max(0, Math.min(colCount - 1, col));
            row = Math.max(0, Math.min(rowCount - 1, row));
            return { row, col };
        },
        [colCount, rowCount]
    );

    const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>, p: PlacedBox) => {
        // Жест начинаем всегда — даже на read-only полке, чтобы по клику
        // (без перетаскивания) можно было открыть коробку.
        e.preventDefault();
        const el = boardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const boxLeft = p.col * (rect.width / colCount);
        const boxTop = p.row * ROW_HEIGHT;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setDrag({
            id: p.box.id,
            pointerId: e.pointerId,
            grabDx: x - boxLeft,
            grabDy: y - boxTop,
            x,
            y,
            startX: x,
            startY: y,
            moved: false,
        });
    };

    const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const el = boardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        const moved =
            drag.moved ||
            Math.hypot(x - drag.startX, y - drag.startY) > DRAG_THRESHOLD;
        // Визуально таскаем коробку только на редактируемой полке.
        setDrag({ ...drag, x: editable ? x : drag.x, y: editable ? y : drag.y, moved });
    };

    const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const id = drag.id;
        const moved = drag.moved;
        const current = placed.find((p) => p.box.id === id);
        setDrag(null);

        // Клик без перетаскивания — открываем коробку.
        if (!moved) {
            if (current) onOpen?.(current.box);
            return;
        }

        // Перетаскивание: сохраняем новую ячейку только на редактируемой полке.
        if (!editable) return;
        const { row, col } = pointToCell(e.clientX, e.clientY);
        if (current && (current.row !== row || current.col !== col)) {
            onMove?.(id, row, col);
        }
    };

    return (
        <div
            ref={boardRef}
            className={`shelf-board ${editable ? "is-editable" : ""}`}
            style={{ height: rowCount * ROW_HEIGHT + LABEL_SPACE }}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            {/* Горизонтальные линии полок. */}
            {Array.from({ length: rowCount }).map((_, row) => (
                <div
                    key={`line-${row}`}
                    className="shelf-line"
                    style={{ top: (row + 1) * ROW_HEIGHT - 1 }}
                />
            ))}

            {/* Коробки. */}
            {placed.map((p) => {
                const isDragging = editable && drag?.id === p.box.id && drag.moved;
                const rarityKey = p.box.template.rarity?.toLowerCase() ?? "";
                const rarityGlow = rarityGlowMap[rarityKey] ?? null;
                const boardW = cellWidth * colCount;
                const boardH = rowCount * ROW_HEIGHT;
                const cellW = cellWidth || 0;
                const style: React.CSSProperties = isDragging
                    ? {
                          left: Math.max(0, Math.min(drag!.x - drag!.grabDx, boardW - cellW)),
                          top: Math.max(0, Math.min(drag!.y - drag!.grabDy, boardH - ROW_HEIGHT)),
                          width: cellW || undefined,
                          height: ROW_HEIGHT,
                      }
                    : {
                          left: `${p.col * cellWidthPct}%`,
                          top: p.row * ROW_HEIGHT,
                          width: `${cellWidthPct}%`,
                          height: ROW_HEIGHT,
                      };
                return (
                    <div
                        key={p.box.id}
                        className={`shelf-cell ${isDragging ? "is-dragging" : ""}`}
                        style={style}
                        onPointerDown={(e) => handlePointerDown(e, p)}
                    >
                        <div className="shelf-cell-inner">
                            <WireframeBox size={80} rarityGlow={rarityGlow} />
                        </div>
                        <div className="shelf-box-label">
                            <span className="shelf-box-name">
                                {p.box.template.title}
                            </span>
                            <span className={`shelf-box-rarity rarity-tag-${rarityKey}`}>
                                {p.box.template.rarity}
                            </span>
                        </div>
                    </div>
                );
            })}

            {placed.length === 0 && (
                <p className="shelf-board-empty">
                    Пока здесь пусто. Время добавить первую коробку!
                </p>
            )}
        </div>
    );
};
