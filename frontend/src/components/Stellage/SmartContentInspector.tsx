import { useState } from "react";
import { SparklesIcon } from "../UI/Icons";
import "./SmartContentInspector.css";

interface SmartContentInspectorProps {
    content?: string;
    boxTitle?: string;
}

export const SmartContentInspector = ({ content = "", boxTitle }: SmartContentInspectorProps) => {
    const [copied, setCopied] = useState(false);

    if (!content || content.trim().length === 0) return null;

    const trimmed = content.trim();

    // Auto-detect code / math characteristics
    const isLatexDoc = trimmed.includes("\\documentclass") || trimmed.includes("\\begin{document}") || (trimmed.includes("\\section") && trimmed.includes("\\usepackage"));
    const hasCodeKeywords = !isLatexDoc && (/^(import |def |class |function |const |let |var |select |from |return |#include|<html|\/\*|```)/i.test(trimmed) || trimmed.includes("def ") || trimmed.includes("return "));
    const hasMath = !isLatexDoc && (trimmed.includes("$$") || trimmed.includes("\\frac") || trimmed.includes("\\sum") || trimmed.includes("\\sqrt") || trimmed.includes("d^2"));

    const lines = trimmed.split("\n");
    const lineCount = lines.length;

    const detectLanguage = () => {
        if (isLatexDoc) return "LaTeX Document";
        if (hasMath) return "LaTeX / Math";
        if (trimmed.includes("def ") || trimmed.includes("import numpy") || trimmed.includes("print(")) return "Python 3.13";
        if (trimmed.includes("interface ") || trimmed.includes("const ") || trimmed.includes("React")) return "TypeScript";
        if (trimmed.includes("SELECT ") || trimmed.includes("FROM ")) return "PostgreSQL";
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "JSON Data";
        return "Plain Text / Document";
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(trimmed);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderLatexDocument = (str: string) => {
        let text = str;
        const titleMatch = text.match(/\\title\{([^}]+)\}/);
        const authorMatch = text.match(/\\author\{([^}]+)\}/);
        const dateMatch = text.match(/\\date\{([^}]+)\}/);

        const docTitle = titleMatch ? titleMatch[1].replace(/\\LaTeX\{\}/g, "LaTeX").trim() : null;
        const docAuthor = authorMatch ? authorMatch[1].trim() : null;
        const docDate = dateMatch ? dateMatch[1].replace(/\\today/g, "Сегодня").trim() : null;

        const bodyMatch = text.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
        if (bodyMatch) {
            text = bodyMatch[1];
        } else {
            text = text.replace(/\\documentclass[\s\S]*?\\begin\{document\}/g, "");
        }

        text = text.replace(/\\maketitle/g, "");

        const formatMathString = (s: string): string => {
            let res = s;
            res = res.replace(/\\LaTeX\{\}/g, "LaTeX").replace(/\\LaTeX/g, "LaTeX");

            const formatFracs = (str: string): string => {
                return str.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
                    return `<span class="math-fraction"><span class="math-num">${formatFracs(num)}</span><span class="math-den">${formatFracs(den)}</span></span>`;
                });
            };
            res = formatFracs(res);

            res = res
                .replace(/\\sqrt\{([^{}]+)\}/g, "√<span class='math-sqrt'>$1</span>")
                .replace(/\\pm/g, "±")
                .replace(/\\mp/g, "∓")
                .replace(/\\cdot/g, "·")
                .replace(/\\times/g, "×")
                .replace(/\\div/g, "÷")
                .replace(/\\neq/g, "≠")
                .replace(/\\leq/g, "≤")
                .replace(/\\geq/g, "≥")
                .replace(/\\approx/g, "≈")
                .replace(/\\partial/g, "∂")
                .replace(/\\nabla/g, "∇")
                .replace(/\\int/g, "∫")
                .replace(/\\sum/g, "∑")
                .replace(/\\prod/g, "∏")
                .replace(/\\infty/g, "∞")
                .replace(/\\theta/g, "<i>θ</i>")
                .replace(/\\alpha/g, "<i>α</i>")
                .replace(/\\beta/g, "<i>β</i>")
                .replace(/\\gamma/g, "<i>γ</i>")
                .replace(/\\delta/g, "<i>δ</i>")
                .replace(/\\pi/g, "<i>π</i>")
                .replace(/\\omega/g, "<i>ω</i>")
                .replace(/\\sigma/g, "<i>σ</i>");

            res = res.replace(/_\{([^{}]+)\}/g, "<sub>$1</sub>");
            res = res.replace(/_([0-9a-zA-Z\+\-]+)/g, "<sub>$1</sub>");
            res = res.replace(/\^\{([^{}]+)\}/g, "<sup>$1</sup>");
            res = res.replace(/\^([0-9a-zA-Z\+\-]+)/g, "<sup>$1</sup>");

            return res;
        };

        text = text.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (_, eq) => {
            return `<div class="latex-doc-equation">${formatMathString(eq.trim())}</div>`;
        });

        text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => `<span class="latex-inline-math">${formatMathString(m)}</span>`);
        text = text.replace(/\$([^$\n]+)\$/g, (_, m) => `<span class="latex-inline-math">${formatMathString(m)}</span>`);

        text = text.replace(/\\section\{([^}]+)\}/g, '<h3 class="latex-doc-h3">$1</h3>');
        text = text.replace(/\\subsection\{([^}]+)\}/g, '<h4 class="latex-doc-h4">$1</h4>');

        text = text.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
        text = text.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');

        text = text.replace(/\\begin\{itemize\}/g, '<ul class="latex-doc-list">');
        text = text.replace(/\\end\{itemize\}/g, '</ul>');
        text = text.replace(/\\begin\{enumerate\}/g, '<ol class="latex-doc-list">');
        text = text.replace(/\\end\{enumerate\}/g, '</ol>');
        text = text.replace(/\\item\s+([^\n]+)/g, '<li>$1</li>');

        const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
        const htmlBody = paragraphs
            .map((p) => {
                const cleanP = p.trim();
                if (
                    cleanP.startsWith("<h3") ||
                    cleanP.startsWith("<h4") ||
                    cleanP.startsWith("<div") ||
                    cleanP.startsWith("<ul") ||
                    cleanP.startsWith("<ol")
                ) {
                    return cleanP;
                }
                return `<p class="latex-doc-p">${cleanP}</p>`;
            })
            .join("");

        return {
            title: docTitle,
            author: docAuthor,
            date: docDate,
            htmlBody,
        };
    };

    const extractLatexMath = (str: string): string => {
        const mathMatch = str.match(/\$\$([\s\S]+?)\$\$/);
        if (mathMatch) return mathMatch[1].trim();
        const fracMatch = str.match(/(\\frac\{[^{}]+\}\{[^{}]+\}[\s\S]*)/);
        if (fracMatch) return fracMatch[1].trim();
        return str.replace(/\$\$/g, "").trim();
    };

    const renderLatex = (str: string) => {
        let clean = extractLatexMath(str);

        // Helper to format fraction \frac{a}{b}
        const formatFractions = (s: string): string => {
            return s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
                return `<span class="math-fraction"><span class="math-num">${formatFractions(num)}</span><span class="math-den">${formatFractions(den)}</span></span>`;
            });
        };

        let formatted = formatFractions(clean);

        // Replace Greek letters and math symbols
        formatted = formatted
            .replace(/\\theta/g, "<i>θ</i>")
            .replace(/\\alpha/g, "<i>α</i>")
            .replace(/\\beta/g, "<i>β</i>")
            .replace(/\\gamma/g, "<i>γ</i>")
            .replace(/\\delta/g, "<i>δ</i>")
            .replace(/\\pi/g, "<i>π</i>")
            .replace(/\\omega/g, "<i>ω</i>")
            .replace(/\\sigma/g, "<i>σ</i>")
            .replace(/\\infty/g, "∞")
            .replace(/\\sin/g, "<span class='math-func'>sin</span>")
            .replace(/\\cos/g, "<span class='math-func'>cos</span>")
            .replace(/\\tan/g, "<span class='math-func'>tan</span>")
            .replace(/\\sqrt\{([^{}]+)\}/g, "√<span class='math-sqrt'>$1</span>")
            .replace(/d\^2/g, "d²")
            .replace(/\^2/g, "²")
            .replace(/\^3/g, "³")
            .replace(/\^n/g, "ⁿ");

        return { __html: formatted };
    };

    return (
        <div className="smart-content-inspector">
            <div className="inspector-header">
                <div className="inspector-meta">
                    <SparklesIcon size={14} className="inspector-sparkle" />
                    <span className="inspector-title">{boxTitle ? `${boxTitle} · Inspector` : "Умный инспектор контента"}</span>
                    <span className="inspector-lang-tag">{detectLanguage()}</span>
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
                            <span>Скопировать код</span>
                        </>
                    )}
                </button>
            </div>

            {isLatexDoc ? (
                <div className="inspector-latex-doc-pane">
                    {(() => {
                        const latexDocs = trimmed
                            .split(/(?=\\documentclass)/g)
                            .map((b) => b.trim())
                            .filter((b) => b.length > 0 && (b.includes("\\documentclass") || b.includes("\\begin{document}")));
                        const listToRender = latexDocs.length > 0 ? latexDocs : [trimmed];

                        return listToRender.map((docRaw, idx) => {
                            const doc = renderLatexDocument(docRaw);
                            return (
                                <div key={idx} className="latex-doc-card" style={{ marginBottom: idx < listToRender.length - 1 ? 16 : 0 }}>
                                    {doc.title && <h2 className="latex-doc-title">{doc.title}</h2>}
                                    {(doc.author || doc.date) && (
                                        <div className="latex-doc-meta">
                                            {doc.author && <span>Автор: <strong>{doc.author}</strong></span>}
                                            {doc.date && <span>Дата: {doc.date}</span>}
                                        </div>
                                    )}
                                    <div className="latex-doc-content" dangerouslySetInnerHTML={{ __html: doc.htmlBody }} />
                                </div>
                            );
                        });
                    })()}
                </div>
            ) : (
                <>
                    {(hasCodeKeywords || lineCount > 1) ? (
                        <div className="inspector-code-body">
                            <div className="inspector-gutter">
                                {lines.map((_, i) => (
                                    <span key={i} className="gutter-num">{i + 1}</span>
                                ))}
                            </div>
                            <pre className="inspector-code-block">
                                <code>{trimmed}</code>
                            </pre>
                        </div>
                    ) : (
                        <div className="inspector-text-body">
                            <p>{trimmed}</p>
                        </div>
                    )}

                    {hasMath && (
                        <div className="inspector-math-card">
                            <div className="math-card-label">Математическое выражение (LaTeX):</div>
                            <div className="math-card-render" dangerouslySetInnerHTML={renderLatex(trimmed)} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
