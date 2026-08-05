import { useEffect, useState } from "react";
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
    const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

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
                title: boxTitle ? `${boxTitle}` : "Окно",
                mode: isLatexDoc ? "text" : (hasCodeKeywords || lines.length > 1 ? "code" : "text"),
                text: trimmed,
                is_completed: false,
            },
        ];
    })();

    const [blocksState, setBlocksState] = useState<BoxContentBlock[]>(initialBlocks);

    // При обновлении содержимого снаружи (например, после сохранения изменений в модалке)
    // синхронизируем локальное состояние с новым пропсом.
    useEffect(() => {
        if (rawContent?.blocks && rawContent.blocks.length > 0) {
            setBlocksState(rawContent.blocks);
        } else if (content) {
            const trimmed = content.trim();
            const isLatexDoc = trimmed.includes("\\documentclass") || trimmed.includes("\\begin{document}");
            const hasCodeKeywords = !isLatexDoc && (/^(import |def |class |function |const |let |var |select |from |return |#include|<html|\/\*|```)/i.test(trimmed) || trimmed.includes("def "));
            const lines = trimmed.split("\n");
            setBlocksState([
                {
                    id: "def-1",
                    title: boxTitle ? `${boxTitle}` : "Окно",
                    mode: isLatexDoc ? "text" : (hasCodeKeywords || lines.length > 1 ? "code" : "text"),
                    text: trimmed,
                },
            ]);
        } else {
            setBlocksState([]);
        }
    }, [rawContent, content, boxTitle]);

    if (!blocksState || blocksState.length === 0) return null;

    // Переключение кликабельного чекбокса внутри списка задач
    const toggleTodoLine = (blockIndex: number, lineIdx: number) => {
        const block = blocksState[blockIndex];
        if (!block) return;

        const currentLines = (block.text || "").split("\n");
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
            i === blockIndex ? { ...b, text: newText } : b
        );
        setBlocksState(next);
        if (onUpdateBlocks) onUpdateBlocks(next);
    };

    const handleCopy = (blockId: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedBlockId(blockId);
        setTimeout(() => setCopiedBlockId(null), 2000);
    };

    return (
        <div className="smart-content-inspector-list">
            {blocksState.map((block, blockIndex) => {
                const blockText = block.text || "";
                const lines = blockText.split("\n");
                const lineCount = lines.length;
                const blockId = block.id || `block-${blockIndex}`;

                return (
                    <div key={blockId} className="smart-content-inspector-block">
                        {/* Заголовок блока */}
                        <div className="inspector-header">
                            <div className="inspector-meta">
                                <SparklesIcon size={14} className="inspector-sparkle" />
                                <span className="inspector-title">{block.title || `Окно ${blockIndex + 1}`}</span>
                                <span className="inspector-lines-tag">{lineCount} {lineCount === 1 ? "строка" : lineCount < 5 ? "строки" : "строк"}</span>
                            </div>

                            <button
                                type="button"
                                className="inspector-copy-btn"
                                onClick={() => handleCopy(blockId, blockText)}
                                title={copiedBlockId === blockId ? "Скопировано!" : "Скопировать контент"}
                                aria-label="Скопировать контент"
                            >
                                {copiedBlockId === blockId ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Содержимое блока: Код, Текст или Список задач */}
                        {block.mode === "code" && (
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

                        {block.mode === "text" && (
                            <div className="inspector-text-body">
                                {lines.map((line, idx) => (
                                    <p key={idx} className="inspector-text-paragraph">{line}</p>
                                ))}
                            </div>
                        )}

                        {block.mode === "todo" && (
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
                                            onClick={() => toggleTodoLine(blockIndex, idx)}
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
            })}
        </div>
    );
};
