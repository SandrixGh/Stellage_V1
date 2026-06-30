import { useEffect, useRef, useState } from "react";
import "./Select.css";

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    /** Доп. класс на корень для управления шириной/раскладкой в конкретном месте. */
    className?: string;
    ariaLabel?: string;
}

/**
 * Кастомный селект в фирменном стиле Stellage (тёмное стекло, бежевый акцент).
 * Нативный <select> не позволяет стилизовать выпадающий список — поэтому
 * рисуем свой триггер + меню. Закрывается по клику вне и по Escape.
 */
export const Select = ({ value, options, onChange, className, ariaLabel }: SelectProps) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = options.find((o) => o.value === value);

    useEffect(() => {
        if (!open) return;
        const onDocPointer = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDocPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div className={`ui-select${className ? ` ${className}` : ""}`} ref={rootRef}>
            <button
                type="button"
                className={`ui-select-trigger${open ? " is-open" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                onClick={() => setOpen((v) => !v)}
            >
                <span className="ui-select-value">{selected?.label ?? value}</span>
                <svg
                    className="ui-select-chevron"
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    aria-hidden="true"
                >
                    <path
                        d="M1 1l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {open && (
                <ul className="ui-select-menu" role="listbox">
                    {options.map((opt) => (
                        <li
                            key={opt.value}
                            role="option"
                            aria-selected={opt.value === value}
                            className={`ui-select-option${opt.value === value ? " is-selected" : ""}`}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                        >
                            {opt.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
