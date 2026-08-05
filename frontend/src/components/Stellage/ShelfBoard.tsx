import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Box } from "../../types/Stellage/boxes";
import { WireframeBox } from "./WireframeBox";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import { formatCount } from "../../utils/formatCount";
import { ShelfGridLabels } from "./ShelfGridLabels";
import { CellStatusPicker } from "./CellStatusPicker";
import { HeartIcon } from "../UI/Icons";
import type { CellStatus } from "../../store/useStudyStore";
import "./ShelfBoard.css";

interface ShelfBoardProps {
    boxes: Box[];
    editable: boolean;
    rowCount?: number;
    colCount?: number;
    onMove?: (id: string, row: number, col: number) => void;
    /** Открыть коробку (клик без перетаскивания). Работает и на read-only полке. */
    onOpen?: (box: Box) => void;
    studyLabels?: {
        rowLabels: string[];
        colLabels: string[];
        cellStatuses: Record<string, CellStatus>;
    };
}

interface PlacedBox {
    box: Box;
    row: number;
    col: number;
}

/** Высота одной полки в пикселях (включает зону для коробки + полку под ней). */
const DEFAULT_ROW_HEIGHT = 128;

/** Отступ сверху доски: визуально «приподнимает» все полки, освобождая место
 * снизу под двухстрочную бирку (редкость + лайки) нижнего ряда. */
const TOP_PADDING = 16;

/** Запас под последней линией, чтобы двухстрочная бирка нижнего ряда (редкость
 * + лайки под ней) не обрезалась и не вылезала за пределы стеллажа. */
const LABEL_SPACE = 64;

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
    studyLabels,
}: ShelfBoardProps) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [cellWidth, setCellWidth] = useState(0);
    const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);

    const [activePicker, setActivePicker] = useState<{
        row: number;
        col: number;
        x: number;
        y: number;
    } | null>(null);

    const placed = useMemo(
        () => placeBoxes(boxes, rowCount, colCount),
        [boxes, rowCount, colCount]
    );

    useLayoutEffect(() => {
        const el = boardRef.current;
        if (!el) return;

        let rafId: number | null = null;
        const measure = () => {
            const w = el.clientWidth / colCount;
            const isSmallScreen = el.clientWidth < 840;
            const minH = isSmallScreen ? 62 : 88;
            const maxH = isSmallScreen ? 80 : DEFAULT_ROW_HEIGHT;
            const targetFactor = isSmallScreen ? 1.05 : 1.3;
            const newRowH = Math.max(minH, Math.min(maxH, Math.round(w * targetFactor)));
            setCellWidth((prevW) => (Math.abs(prevW - w) > 0.5 ? w : prevW));
            setRowHeight((prevH) => (Math.abs(prevH - newRowH) > 0.5 ? newRowH : prevH));
        };

        const handleResize = () => {
            if (rafId === null) {
                rafId = requestAnimationFrame(() => {
                    rafId = null;
                    measure();
                });
            }
        };

        measure();

        const observer = new ResizeObserver(handleResize);
        observer.observe(el);

        return () => {
            observer.disconnect();
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
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
            let row = Math.round((localY - TOP_PADDING - rowHeight / 2) / rowHeight);
            col = Math.max(0, Math.min(colCount - 1, col));
            row = Math.max(0, Math.min(rowCount - 1, row));
            return { row, col };
        },
        [colCount, rowCount, rowHeight]
    );

    const handleEmptyCellClick = (e: React.MouseEvent, row: number, col: number) => {
        if (!studyLabels) return;
        const el = boardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const posX = e.clientX - rect.left;
        const posY = e.clientY - rect.top;
        setActivePicker({ row, col, x: posX, y: posY });
    };

    const dragRafRef = useRef<number | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTouchRef = useRef<{
        id: string;
        pointerId: number;
        startX: number;
        startY: number;
        grabDx: number;
        grabDy: number;
    } | null>(null);

    const clearLongPress = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        pendingTouchRef.current = null;
    }, []);

    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>, p: PlacedBox) => {
        const el = boardRef.current;
        if (!el) return;

        // Синхронный захват указателя при нажатии предотвращает отмену касания браузером
        try {
            el.setPointerCapture(e.pointerId);
        } catch {}

        const rect = el.getBoundingClientRect();
        const boxLeft = p.col * (rect.width / colCount);
        const boxTop = TOP_PADDING + p.row * rowHeight;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const grabDx = x - boxLeft;
        const grabDy = y - boxTop;

        clearLongPress();

        if (e.pointerType === "touch" || e.pointerType === "pen") {
            pendingTouchRef.current = {
                id: p.box.id,
                pointerId: e.pointerId,
                startX: x,
                startY: y,
                grabDx,
                grabDy,
            };

            if (editable) {
                // Инициализируем структуру перетаскивания
                setDrag({
                    id: p.box.id,
                    pointerId: e.pointerId,
                    grabDx,
                    grabDy,
                    x,
                    y,
                    startX: x,
                    startY: y,
                    moved: false,
                });

                // Вибрация отклика через 140мс зажатия
                longPressTimerRef.current = setTimeout(() => {
                    try {
                        navigator?.vibrate?.(35);
                    } catch {}
                    setDrag((prev) => (prev ? { ...prev, moved: true } : null));
                }, 140);
            }
        } else {
            e.preventDefault();
            setDrag({
                id: p.box.id,
                pointerId: e.pointerId,
                grabDx,
                grabDy,
                x,
                y,
                startX: x,
                startY: y,
                moved: false,
            });
        }
    };

    const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const el = boardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        const pending = pendingTouchRef.current;
        if (pending && pending.pointerId === e.pointerId && !drag?.moved) {
            const dy = Math.abs(y - pending.startY);
            const dx = Math.abs(x - pending.startX);
            // Отменяем удержание ТОЛЬКО при явном намерении прокрутить страницу по вертикали (>32px)
            if (dy > 32 && dy > dx * 1.5) {
                clearLongPress();
                return;
            }
        }

        if (!drag || e.pointerId !== drag.pointerId) return;

        if (e.cancelable && (drag.moved || editable)) {
            e.preventDefault();
        }

        const dist = Math.hypot(x - drag.startX, y - drag.startY);
        const moved = drag.moved || (editable && dist > DRAG_THRESHOLD);

        if (moved && longPressTimerRef.current) {
            clearLongPress();
        }

        const nextX = editable ? x : drag.x;
        const nextY = editable ? y : drag.y;

        if (dragRafRef.current === null) {
            dragRafRef.current = requestAnimationFrame(() => {
                dragRafRef.current = null;
                setDrag((prev) => (prev ? { ...prev, x: nextX, y: nextY, moved } : null));
            });
        }
    };

    const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (dragRafRef.current !== null) {
            cancelAnimationFrame(dragRafRef.current);
            dragRafRef.current = null;
        }

        const pending = pendingTouchRef.current;
        clearLongPress();

        try {
            if (boardRef.current?.hasPointerCapture(e.pointerId)) {
                boardRef.current.releasePointerCapture(e.pointerId);
            }
        } catch {}

        if (pending && pending.pointerId === e.pointerId && (!drag || !drag.moved)) {
            const current = placed.find((p) => p.box.id === pending.id);
            setDrag(null);
            pendingTouchRef.current = null;
            if (current) {
                onOpen?.(current.box);
            }
            return;
        }

        pendingTouchRef.current = null;

        if (!drag || e.pointerId !== drag.pointerId) return;
        const id = drag.id;
        const moved = drag.moved;
        const current = placed.find((p) => p.box.id === id);
        setDrag(null);

        if (!moved) {
            if (current) onOpen?.(current.box);
            return;
        }

        if (!editable) return;
        const { row, col } = pointToCell(e.clientX, e.clientY);
        if (current && (current.row !== row || current.col !== col)) {
            onMove?.(id, row, col);
        }
    };

    const isMobileGrid = cellWidth > 0 && cellWidth < 90;
    const boxSize = Math.min(145, Math.max(34, Math.round((cellWidth || 45) * (isMobileGrid ? 0.94 : 1.18))));
    const topPadding = isMobileGrid ? 6 : TOP_PADDING;
    const labelSpace = isMobileGrid ? 42 : LABEL_SPACE;

    return (
        <div
            ref={boardRef}
            className={`shelf-board ${editable ? "is-editable" : ""} ${studyLabels ? "has-study-labels" : ""}`}
            style={{ minHeight: topPadding + rowCount * rowHeight + labelSpace }}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Пространственные метки сетки в режиме учёбы */}
            {studyLabels && (
                <ShelfGridLabels
                    rowLabels={studyLabels.rowLabels}
                    colLabels={studyLabels.colLabels}
                    rowCount={rowCount}
                    colCount={colCount}
                    topPadding={topPadding}
                    rowHeight={rowHeight}
                />
            )}

            {/* Горизонтальные линии полок. */}
            {Array.from({ length: rowCount }).map((_, row) => (
                <div
                    key={`line-${row}`}
                    className="shelf-line"
                    style={{ top: topPadding + (row + 1) * rowHeight - 1 }}
                />
            ))}

            {/* СТАТИЧЕСКАЯ СЕТКА ЯЧЕЕК И СТАТУСОВ (Не двигается при перетаскивании коробок) */}
            <div className="shelf-static-grid">
                {Array.from({ length: rowCount }).map((_, row) =>
                    Array.from({ length: colCount }).map((__, col) => {
                        const statusKey = `${row}:${col}`;
                        const status = studyLabels?.cellStatuses[statusKey];
                        return (
                            <div
                                key={`static-cell-${row}-${col}`}
                                className={`shelf-static-cell ${studyLabels ? "is-clickable" : ""}`}
                                data-cell-status={status ?? undefined}
                                style={{
                                    left: `${col * cellWidthPct}%`,
                                    top: topPadding + row * rowHeight,
                                    width: `${cellWidthPct}%`,
                                    height: rowHeight,
                                }}
                                onClick={(e) => studyLabels && handleEmptyCellClick(e, row, col)}
                                title={status ? `Статус: ${status}` : studyLabels ? "Кликните, чтобы задать статус ячейки" : undefined}
                            />
                        );
                    })
                )}
            </div>

            {/* Коробки. */}
            {placed.map((p) => {
                const isDragging = editable && drag?.id === p.box.id && drag.moved;
                const template = p.box.template;
                const rarityKey = template?.rarity?.toLowerCase() ?? "";
                const { rarityGlow, boxColor } = resolveRarityVisual(
                    template?.rarity ?? "common"
                );

                const boardW = cellWidth * colCount;
                const boardH = topPadding + rowCount * rowHeight;
                const cellW = cellWidth || 0;

                // Смещение крайних колонок внутрь сетки предотвращает вылезание 3D коробок за рамки
                const colShift = p.col === colCount - 1 ? -6 : p.col === 0 ? 4 : 0;

                const style: React.CSSProperties = isDragging
                    ? {
                          left: Math.max(0, Math.min(drag!.x - drag!.grabDx, boardW - cellW)),
                          top: Math.max(topPadding, Math.min(drag!.y - drag!.grabDy, boardH - rowHeight)),
                          width: cellW || undefined,
                          height: rowHeight,
                      }
                    : {
                          left: `calc(${p.col * cellWidthPct}% + ${colShift}px)`,
                          top: topPadding + p.row * rowHeight,
                          width: `${cellWidthPct}%`,
                          height: rowHeight,
                      };
                return (
                    <div
                        key={p.box.id}
                        data-col={p.col}
                        className={`shelf-cell ${isDragging ? "is-dragging" : ""}`}
                        style={style}
                        onPointerDown={(e) => handlePointerDown(e, p)}
                    >
                        <div className="shelf-cell-inner">
                            <WireframeBox
                                size={boxSize}
                                rarityGlow={rarityGlow}
                                color={boxColor}
                                contentType={resolveBoxContentType(p.box)}
                                variant="2.5d-slot"
                                coverUrl={(p.box as any).cover_url || (p.box as any).preview_url || null}
                            />
                        </div>
                        <div className="shelf-box-label" data-rarity={rarityKey}>
                            <span className="shelf-box-name">
                                {template?.title ?? "Коробка"}
                            </span>
                            <span
                                className={`shelf-box-rarity rarity-tag-${rarityKey}`}
                                style={{ color: boxColor }}
                            >
                                {template?.rarity?.toLowerCase().includes("dev") ? "DEV" : template?.rarity}
                            </span>
                            <span
                                className={`shelf-box-likes ${p.box.likes_count > 0 ? "has-likes" : "zero-likes"}`}
                                title={`${p.box.likes_count ?? 0} лайков`}
                            >
                                <HeartIcon size={9} />
                                <span>{formatCount(p.box.likes_count ?? 0)}</span>
                            </span>
                        </div>
                    </div>
                );
            })}

            {activePicker && (
                <CellStatusPicker
                    row={activePicker.row}
                    col={activePicker.col}
                    x={activePicker.x}
                    y={activePicker.y}
                    currentStatus={studyLabels?.cellStatuses[`${activePicker.row}:${activePicker.col}`]}
                    onClose={() => setActivePicker(null)}
                />
            )}


        </div>
    );
};
