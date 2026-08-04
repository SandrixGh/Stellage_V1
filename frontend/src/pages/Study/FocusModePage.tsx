import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBoxView, type BoxPublicView } from "../../api/boxes";
import { SmartContentInspector } from "../../components/Stellage/SmartContentInspector";
import { KaTeXRenderer } from "../../components/Stellage/KaTeXRenderer";
import { usePomodoroTimer } from "../../hooks/usePomodoroTimer";
import { ArrowLeftIcon, LockIcon, TargetIcon, BookOpenIcon } from "../../components/UI/Icons";
import { rarityKey } from "../../utils/rarity";
import "./FocusModePage.css";

export const FocusModePage = () => {
    const { boxId } = useParams<{ boxId: string }>();
    const navigate = useNavigate();

    const [view, setView] = useState<BoxPublicView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Notes autosave state
    const notesStorageKey = `stellage-study-notes-${boxId ?? "default"}`;
    const [notes, setNotes] = useState<string>(() => {
        try {
            return localStorage.getItem(notesStorageKey) || "";
        } catch {
            return "";
        }
    });

    const { timeLeft, isRunning, start, pause, reset } = usePomodoroTimer(boxId ?? "default");

    // Fetch box info
    useEffect(() => {
        if (!boxId) return;
        setLoading(true);
        setError(false);
        getBoxView(boxId)
            .then((v) => setView(v))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [boxId]);

    // Autosave notes with 500ms debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(notesStorageKey, notes);
            } catch {
                // ignore
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [notes, notesStorageKey]);

    const formatTimer = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    if (loading) {
        return (
            <div className="focus-page-loading">
                <div className="focus-loading-spinner" />
                <span>Загрузка рабочего пространства Focus Mode…</span>
            </div>
        );
    }

    if (error || !view || !view.box) {
        return (
            <div className="focus-page-error">
                <LockIcon size={40} />
                <h2>Не удалось загрузить модуль</h2>
                <p>Коробка не найдена или недоступна.</p>
                <button type="button" className="focus-btn secondary" onClick={() => navigate(-1)}>
                    <ArrowLeftIcon size={16} />
                    <span>Вернуться</span>
                </button>
            </div>
        );
    }

    const { box } = view;
    const template = box.template;
    const rarity = template?.rarity ?? "common";
    const rKey = rarityKey(rarity);

    const rawText = box.content?.text ?? "";
    const isLatex = rawText.includes("\\frac") || rawText.includes("\\begin") || rawText.includes("$$");

    return (
        <div className="focus-page">
            {/* Topbar: Liquid Glass Header */}
            <header className="focus-topbar">
                <div className="focus-topbar-left">
                    <button type="button" className="focus-back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeftIcon size={16} />
                        <span>Назад</span>
                    </button>
                    <div className="focus-box-meta">
                        <span className="focus-box-title">{template?.title ?? "Учебный модуль"}</span>
                        <span className={`focus-box-rarity rarity-tag-${rKey}`}>{rarity}</span>
                    </div>
                </div>

                <div className="focus-topbar-center">
                    <div className="focus-timer-display">{formatTimer(timeLeft)}</div>
                    <div className="focus-timer-controls">
                        <button
                            type="button"
                            className="focus-timer-btn primary"
                            onClick={isRunning ? pause : start}
                        >
                            {isRunning ? "Пауза" : "Старт"}
                        </button>
                        <button type="button" className="focus-timer-btn secondary" onClick={reset}>
                            Сброс
                        </button>
                    </div>
                </div>

                <div className="focus-topbar-right">
                    <span className="focus-mode-badge">
                        <TargetIcon size={14} />
                        <span>Focus Session</span>
                    </span>
                </div>
            </header>

            {/* Content Zone */}
            <main className="focus-content">
                <div className="focus-content-inner">
                    {isLatex ? (
                        <KaTeXRenderer latexSource={rawText} title={template?.title} />
                    ) : (
                        <SmartContentInspector
                            content={rawText || undefined}
                            boxTitle={template?.title ?? "Контент"}
                        />
                    )}
                </div>
            </main>

            {/* Notes Panel */}
            <footer className="focus-notes-panel">
                <div className="focus-notes-header">
                    <BookOpenIcon size={14} />
                    <span>Заметки к модулю (автосохранение 500ms) · {notes.length} символов</span>
                </div>
                <textarea
                    className="focus-notes-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Записывайте ключевые формулы, инсайты и мысли по ходу фокус-сессии…"
                />
            </footer>
        </div>
    );
};
