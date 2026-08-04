import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SparklesIcon, BoxIcon, HistoryIcon, ExternalLinkIcon, LayersIcon, GraduationCapIcon } from "../UI/Icons";
import { usePomodoroTimer } from "../../hooks/usePomodoroTimer";
import { KaTeXRenderer } from "./KaTeXRenderer";
import { FlashcardDeckSlot } from "./FlashcardDeckSlot";
import type { Box } from "../../types/Stellage/boxes";
import "./StudyContainerSlot.css";

interface StudyContainerSlotProps {
    box?: Box;
    boxTitle?: string;
    description?: string;
}

export const StudyContainerSlot = ({
    box,
    boxTitle,
    description,
}: StudyContainerSlotProps) => {
    const navigate = useNavigate();
    const [activeStudyTab, setActiveStudyTab] = useState<"code" | "flashcards" | "language" | "pomodoro">("code");
    
    const boxId = box?.id ?? "demo-box-id";
    const title = box?.template?.title ?? boxTitle ?? "Учебная Капсула Знаний";
    const desc = box?.template?.description ?? description;

    const { timeLeft, isRunning, start, pause, reset } = usePomodoroTimer(boxId);

    const formatTimer = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    const handleStartFocusMode = () => {
        if (boxId) {
            navigate(`/study/focus/${boxId}`);
        }
    };

    const rawTextContent = box?.content?.text || `import numpy as np

# Решение системы дифференциальных уравнений маятника
def solve_pendulum(theta0, omega0, dt=0.01):
    g, L = 9.81, 1.0
    d2theta = -(g / L) * np.sin(theta0)
    return theta0 + omega0 * dt, omega0 + d2theta * dt

print("STEM Pipeline Ready. Data verified.")`;

    return (
        <div className="study-container-card">
            <div className="study-container-header">
                <div className="study-header-top-row">
                    <div className="study-badge">
                        <GraduationCapIcon size={14} />
                        <span>Stellage Spatial OS · {title}</span>
                    </div>
                    {box && (
                        <button
                            type="button"
                            className="study-focus-mode-launch-btn"
                            onClick={handleStartFocusMode}
                        >
                            <span>Focus Mode</span>
                            <ExternalLinkIcon size={13} />
                        </button>
                    )}
                </div>

                {desc && <div className="study-container-desc">{desc}</div>}
                <div className="study-nav-tabs">
                    <button
                        type="button"
                        className={`study-nav-tab ${activeStudyTab === "code" ? "active" : ""}`}
                        onClick={() => setActiveStudyTab("code")}
                    >
                        <SparklesIcon size={14} />
                        <span>STEM & Math</span>
                    </button>
                    <button
                        type="button"
                        className={`study-nav-tab ${activeStudyTab === "flashcards" ? "active" : ""}`}
                        onClick={() => setActiveStudyTab("flashcards")}
                    >
                        <LayersIcon size={14} />
                        <span>Flashcards</span>
                    </button>
                    <button
                        type="button"
                        className={`study-nav-tab ${activeStudyTab === "language" ? "active" : ""}`}
                        onClick={() => setActiveStudyTab("language")}
                    >
                        <BoxIcon size={14} />
                        <span>Immersion</span>
                    </button>
                    <button
                        type="button"
                        className={`study-nav-tab ${activeStudyTab === "pomodoro" ? "active" : ""}`}
                        onClick={() => setActiveStudyTab("pomodoro")}
                    >
                        <HistoryIcon size={14} />
                        <span>Pomodoro</span>
                    </button>
                </div>
            </div>

            <div className="study-container-content">
                {activeStudyTab === "code" && (
                    <div className="study-view-code">
                        <KaTeXRenderer latexSource={rawTextContent} title={title} />
                    </div>
                )}

                {activeStudyTab === "flashcards" && (
                    <div className="study-view-flashcards">
                        <FlashcardDeckSlot boxId={boxId} />
                    </div>
                )}

                {activeStudyTab === "language" && (
                    <div className="study-view-language">
                        <div className="study-lang-badge">Французский Язык · Subjonctif</div>
                        <div className="study-transcription-card">
                            <div className="phrase-fr">«Il faut que tu fasses attention à tes études.»</div>
                            <div className="phrase-ru">«Тебе необходимо быть внимательным к своей учебе.»</div>
                        </div>
                        <div className="study-audio-preview">
                            <button type="button" className="study-audio-btn">
                                Прослушать произношение диктора
                            </button>
                        </div>
                    </div>
                )}

                {activeStudyTab === "pomodoro" && (
                    <div className="study-view-pomodoro">
                        <div className="pomodoro-timer-display">{formatTimer(timeLeft)}</div>
                        <div className="pomodoro-actions">
                            <button
                                type="button"
                                className="pomodoro-btn primary"
                                onClick={isRunning ? pause : start}
                            >
                                {isRunning ? "Пауза" : "Запустить Фокус-Сессию"}
                            </button>
                            <button type="button" className="pomodoro-btn secondary" onClick={reset}>
                                Сброс
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
