import { useState } from "react";
import { createPortal } from "react-dom";
import "./BoxNameLabel.css";

interface BoxNameLabelProps {
    name: string;
    /** Максимум символов до обрезки троеточием. */
    max?: number;
    /** Класс на текстовый элемент (чтобы наследовать типографику места вызова). */
    className?: string;
}

/**
 * Имя коробки с обрезкой по длине: если оно длиннее `max`, показываем «…» и
 * кнопку-лупу, открывающую попап с полным названием. Управляющий элемент —
 * span с role="button" (а не <button>), чтобы быть валидным внутри карточки-кнопки.
 */
export const BoxNameLabel = ({ name, max = 18, className }: BoxNameLabelProps) => {
    const [open, setOpen] = useState(false);
    const isLong = name.length > max;
    const shown = isLong ? `${name.slice(0, max).trimEnd()}…` : name;

    return (
        <span className="box-name-label">
            <span className={className} title={name}>
                {shown}
            </span>

            {isLong && (
                <span
                    role="button"
                    tabIndex={0}
                    className="box-name-expand"
                    aria-label="Открыть полное название"
                    title="Открыть полное название"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            setOpen(true);
                        }
                    }}
                >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                            d="M2 6V2h4M14 10v4h-4M6 14H2v-4M10 2h4v4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            )}

            {open &&
                createPortal(
                    <div
                        className="box-name-pop-overlay"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                        }}
                    >
                        <div className="box-name-pop" onClick={(e) => e.stopPropagation()}>
                            <span className="box-name-pop-eyebrow">Полное название</span>
                            <p className="box-name-pop-text">{name}</p>
                            <button
                                type="button"
                                className="box-name-pop-close"
                                onClick={() => setOpen(false)}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
        </span>
    );
};
