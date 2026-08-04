import React, { useEffect, useRef } from "react";
import { useStudyStore, type CellStatus } from "../../store/useStudyStore";
import { CheckIcon, CloseIcon } from "../UI/Icons";
import "./CellStatusPicker.css";

interface CellStatusPickerProps {
    row: number;
    col: number;
    currentStatus?: CellStatus;
    x: number;
    y: number;
    onClose: () => void;
}

const STATUSES: { id: NonNullable<CellStatus>; label: string; color: string; badgeClass: string }[] = [
    { id: "urgent", label: "Горит сегодня", color: "#E54D4D", badgeClass: "dot-urgent" },
    { id: "this-week", label: "На эту неделю", color: "#D4A843", badgeClass: "dot-this-week" },
    { id: "backlog", label: "Беклог / Проекты", color: "#4A82D1", badgeClass: "dot-backlog" },
    { id: "done", label: "Выполнено", color: "var(--accent, #4FA98E)", badgeClass: "dot-done" },
];

export const CellStatusPicker: React.FC<CellStatusPickerProps> = ({
    row,
    col,
    currentStatus,
    x,
    y,
    onClose,
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const { setCellStatus, clearCellStatus } = useStudyStore();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    const handleSelect = (status: CellStatus) => {
        if (status === null) {
            clearCellStatus(row, col);
        } else {
            setCellStatus(row, col, status);
        }
        onClose();
    };

    return (
        <div
            ref={popoverRef}
            className="cell-status-picker-popover"
            style={{ left: `${x}px`, top: `${y}px` }}
        >
            <div className="cell-status-picker-header">
                Статус ячейки [{row + 1}, {col + 1}]
            </div>
            <div className="cell-status-picker-list">
                {STATUSES.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        className={`cell-status-picker-item ${currentStatus === s.id ? "active" : ""}`}
                        onClick={() => handleSelect(s.id)}
                    >
                        <span className={`cell-status-dot ${s.badgeClass}`} />
                        <span className="cell-status-label">{s.label}</span>
                        {currentStatus === s.id && <CheckIcon size={14} className="cell-status-check" />}
                    </button>
                ))}
                {currentStatus && (
                    <button
                        type="button"
                        className="cell-status-picker-item clear-item"
                        onClick={() => handleSelect(null)}
                    >
                        <CloseIcon size={14} />
                        <span>Сбросить статус</span>
                    </button>
                )}
            </div>
        </div>
    );
};
