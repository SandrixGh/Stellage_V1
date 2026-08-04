import { useState } from "react";
import { SparklesIcon, CheckIcon } from "../UI/Icons";
import "./KaTeXRenderer.css";

interface KaTeXRendererProps {
    latexSource: string;
    title?: string;
}

export const KaTeXRenderer = ({ latexSource, title = "Математический документ" }: KaTeXRendererProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(latexSource);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Extract formulas or key sections cleanly
    const mathLines = latexSource
        .split("\n")
        .filter((line) => line.includes("\\frac") || line.includes("\\sum") || line.includes("\\int") || line.includes("\\begin{equation}") || line.includes("$$") || line.includes("$"));

    return (
        <div className="katex-renderer-container">
            {/* Header */}
            <div className="katex-renderer-header">
                <div className="katex-header-title">
                    <SparklesIcon size={16} className="katex-sparkle-icon" />
                    <span>{title} · LaTeX / Math Inspector</span>
                </div>
                <button type="button" className="katex-copy-btn" onClick={handleCopy}>
                    {copied ? (
                        <>
                            <CheckIcon size={14} />
                            <span>Скопировано</span>
                        </>
                    ) : (
                        <span>Скопировать LaTeX</span>
                    )}
                </button>
            </div>

            {/* Display Math Card */}
            <div className="katex-math-display-card">
                <div className="katex-badge">Display Formula</div>
                <div className="katex-formula-rendered">
                    {/* Rendered representation of equations */}
                    {mathLines.length > 0 ? (
                        mathLines.map((eq, idx) => (
                            <div key={`eq-${idx}`} className="katex-eq-row">
                                <span className="katex-eq-num">({idx + 1})</span>
                                <code className="katex-eq-math">{eq.replace(/\\begin{equation}|\\end{equation}|\$\$/g, "").trim()}</code>
                            </div>
                        ))
                    ) : (
                        <code className="katex-eq-math">{latexSource.trim()}</code>
                    )}
                </div>
            </div>

            {/* Document Source Accordion */}
            <details className="katex-source-details">
                <summary className="katex-source-summary">Исходный код LaTeX</summary>
                <pre className="katex-source-code">
                    <code>{latexSource}</code>
                </pre>
            </details>
        </div>
    );
};
