import React from "react";
import "./ShelfGridLabels.css";

interface ShelfGridLabelsProps {
    rowLabels: string[];
    colLabels: string[];
    rowCount: number;
    colCount: number;
    topPadding?: number;
    rowHeight?: number;
}

export const ShelfGridLabels: React.FC<ShelfGridLabelsProps> = ({
    rowLabels,
    colLabels,
    rowCount,
    colCount,
    topPadding = 16,
    rowHeight = 128,
}) => {
    const colWidthPct = 100 / colCount;

    return (
        <div className="shelf-grid-labels-overlay">
            {/* Top Column Labels */}
            <div className="shelf-col-labels">
                {Array.from({ length: colCount }).map((_, col) => {
                    const label = colLabels[col] || `Колонка ${col + 1}`;
                    return (
                        <div
                            key={`col-label-${col}`}
                            className="shelf-col-label-item"
                            style={{
                                left: `${col * colWidthPct}%`,
                                width: `${colWidthPct}%`,
                            }}
                            title={label}
                        >
                            <span>{label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Left Row Labels */}
            <div className="shelf-row-labels">
                {Array.from({ length: rowCount }).map((_, row) => {
                    const label = rowLabels[row] || `Ряд ${row + 1}`;
                    return (
                        <div
                            key={`row-label-${row}`}
                            className="shelf-row-label-item"
                            style={{
                                top: topPadding + row * rowHeight + rowHeight / 2 - 12,
                            }}
                            title={label}
                        >
                            <span>{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
