import { useState } from "react";
import { SparklesIcon } from "../UI/Icons";
import type { BoxContent, BoxContentBlock } from "../../types/Stellage/boxes";
import "./SmartContentInspector.css";

interface SmartContentInspectorProps {
    content?: string;
    rawContent?: BoxContent | null;
    boxTitle?: string;
    onUpdateBlocks?: (updatedBlocks: BoxContentBlock[]) => void;
}

export const SmartContentInspector = ({
    content = "",
    rawContent,
    boxTitle,
    onUpdateBlocks,
}: SmartContentInspectorProps) => {
    const [copied, setCopied] = useState(false);
    const [activeBlockIndex, setActiveBlockIndex] = useState(0);

    // Подготавливаем блоки контента
    const initialBlocks: BoxContentBlock[] = (() => {
        if (rawContent?.blocks && rawContent.blocks.length > 0) {
            return rawContent.blocks;
        }
        if (!content || content.trim().length === 0) return [];
        const trimmed = content.trim();
        const isLatexDoc = trimmed.includes("\\documentclass") || trimmed.includes("\\begin{document}");
        const hasCodeKeywords = !isLatexDoc && (/^(import |def |class |function |const |let |var |select |from |return |#include|<html|\/\*|```)/i.test(trimmed) || trimmed.includes("def "));
        const lines = trimmed.split("\n");

        return [
            {
                id: "def-1",
                title: boxTitle ? `${boxTitle} · Inspector` : "Окно контента",
                mode: isLatexDoc ? "text" : (hasCodeKeywords || lines.length > 1 ? "code" : "text"),
                text: trimmed,
                is_completed: false,
            },
        ];
    })();

    const [blocksState, setBlocksState] = useState<BoxContentBlock[]>(initialBlocks);

    if (!blocksState || blocksState.length === 0) return null;

    const safeIndex = Math.min(activeBlockIndex, blocksState.length - 1);
    const activeBlock = blocksState[safeIndex] || blocksState[0];
    const blockText = activeBlock.text || "";
    const lines = blockText.split("\n");
    const lineCount = lines.length;

    // Переключение галочки выполнения всего окна (SVG Checkmark)
    const toggleBlockCompletion = (idx: number) => {
        const next = blocksState.map((b, i) =>
            i === idx ? { ...b, is_completed: !b.is_completed } : b
        );
        setBlocksState(next);
        if (onUpdateBlocks) onUpdateBlocks(next);
    };

    // Переключение кликабельного чекбокса внутри списка задач
    const toggleTodoLine = (lineIdx: number) => {
        const currentLines = blockText.split("\n");
        const targetLine = currentLines[lineIdx];
        if (targetLine === undefined) return;

        let updatedLine = targetLine;
        if (targetLine.includes("[ ]")) {
            updatedLine = targetLine.replace("[ ]", "[x]");
        } else if (targetLine.includes("[x]")) {
            updatedLine = targetLine.replace("[x]", "[ ]");
        } else if (targetLine.trim().startsWith("- ")) {
            updatedLine = targetLine.replace("- ", "- [x] ");
        } else if (targetLine.trim().startsWith("✓ ")) {
            updatedLine = targetLine.replace("✓ ", "");
        } else {
            updatedLine = `✓ ${targetLine}`;
        }

        currentLines[lineIdx] = updatedLine;
        const newText = currentLines.join("\n");

        const next = blocksState.map((b, i) =>
            i === safeIndex ? { ...b, text: newText } : b
        );
        setBlocksState(next);
        if (onUpdateBlocks) onUpdateBlocks(next);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(blockText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getModeLabel = (mode: string) => {
        switch (mode) {
            case "code":
                return "CODE / ИСХОДНЫЙ КОД";
            case "text":
                return "DOCUMENT / ТЕКСТ";
            case "todo":
                return "CHECKLIST / СПИСОК ЗАДАЧ";
            default:
                return mode.toUpperCase();
        }
    };

    return (
        <div className="smart-content-inspector">
            {/* Панель вкладок окон контента */}
            {blocksState.length > 1 && (
                <div className="inspector-tabs-bar">
                    {blocksState.map((b, idx) => (
                        <button
                            key={b.id || idx}
                            type="button"
                            className={`inspector-tab-btn ${idx === safeIndex ? "is-active" : ""} ${b.is_completed ? "is-completed" : ""}`}
                            onClick={() => setActiveBlockIndex(idx)}
                        >
                            {/* SVG Галочка выполнения окна */}
                            <span
                                className={`inspector-tab-checkmark ${b.is_completed ? "checked" : ""}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBlockCompletion(idx);
                                }}
                                title={b.is_completed ? "Отмечено как выполненное" : "Отметить окно как выполненное"}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </span>
                            <span className="inspector-tab-title">{b.title || `Окно ${idx + 1}`}</span>
                            {b.is_completed && <span className="inspector-tab-done-badge">Выполнено</span>}
                        </button>
                    ))}
                </div>
            )}

            {/* Мета-заголовок активного окна */}
            <div className="inspector-header">
                <div className="inspector-meta">
                    {/* SVG Галочка выполнения одиночного окна (если 1 окно) */}
                    {blocksState.length === 1 && (
                        <button
                            type="button"
                            className={`inspector-header-check-btn ${activeBlock.is_completed ? "is-checked" : ""}`}
                            onClick={() => toggleBlockCompletion(0)}
                            title={activeBlock.is_completed ? "Выполнено" : "Отметить выполненным"}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </button>
                    )}
                    <SparklesIcon size={14} className="inspector-sparkle" />
                    <span className="inspector-title">{activeBlock.title || boxTitle || "Умный инспектор контента"}</span>
                    <span className="inspector-lang-tag">{getModeLabel(activeBlock.mode)}</span>
                    <span className="inspector-lines-tag">{lineCount} {lineCount === 1 ? "строка" : lineCount < 5 ? "строки" : "строк"}</span>
                </div>
                <button type="button" className="inspector-copy-btn" onClick={handleCopy}>
                    {copied ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Скопировано!</span>
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            <span>Скопировать контент</span>
                        </>
                    )}
                </button>
            </div>

            {/* Тело окна: Код, Текст или Список задач */}
            {activeBlock.mode === "code" && (
                <div className="inspector-code-body">
                    <div className="inspector-gutter">
                        {lines.map((_, i) => (
                            <span key={i} className="gutter-num">{i + 1}</span>
                        ))}
                    </div>
                    <pre className="inspector-code-block">
                        <code>{blockText}</code>
                    </pre>
                </div>
            )}

            {activeBlock.mode === "text" && (
                <div className="inspector-text-body">
                    {lines.map((line, idx) => (
                        <p key={idx} className="inspector-text-paragraph">{line}</p>
                    ))}
                </div>
            )}

            {activeBlock.mode === "todo" && (
                <div className="inspector-todo-body">
                    {lines.map((line, idx) => {
                        const isDone = line.includes("[x]") || line.trim().startsWith("✓ ");
                        const cleanLineText = line
                            .replace(/^[-\*\d\.\)\s]*\[[ xX]\]\s*/, "")
                            .replace(/^✓\s*/, "");

                        return (
                            <div
                                key={idx}
                                className={`inspector-todo-item ${isDone ? "is-done" : ""}`}
                                onClick={() => toggleTodoLine(idx)}
                            >
                                <span className={`inspector-todo-checkbox ${isDone ? "checked" : ""}`}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </span>
                                <span className="inspector-todo-text">{cleanLineText || line}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
