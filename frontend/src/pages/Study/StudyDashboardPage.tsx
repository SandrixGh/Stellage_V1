import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudyStore } from "../../store/useStudyStore";
import { useStellageStore } from "../../store/useStellageStore";
import { ShelfBoard } from "../../components/Stellage/ShelfBoard";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ExamCountdownWidget } from "../../components/Stellage/ExamCountdownWidget";
import { FocusStreakWidget } from "../../components/Stellage/FocusStreakWidget";
import {
    SparklesIcon,
    BoxIcon,
    HistoryIcon,
    ExternalLinkIcon,
    ClockIcon,
    FlameIcon,
    CalendarIcon,
    CheckCircleIcon,
    GraduationCapIcon,
} from "../../components/UI/Icons";
import "./StudyDashboardPage.css";

interface ActiveSessionItem {
    boxId: string;
    timeLeft: number;
    totalDuration: number;
    isRunning: boolean;
    hasNotes: boolean;
}

export const StudyDashboardPage = () => {
    const navigate = useNavigate();
    const {
        studyModeEnabled,
        rowLabels,
        colLabels,
        cellStatuses,
        focusTimerMinutes,
    } = useStudyStore();
    const { mainShelf, fetchShelves } = useStellageStore();

    const [activeSessions, setActiveSessions] = useState<ActiveSessionItem[]>([]);

    useEffect(() => {
        fetchShelves();
    }, [fetchShelves]);

    // Scan localStorage for active study pomodoro sessions or notes
    useEffect(() => {
        if (typeof window === "undefined") return;
        const sessions: ActiveSessionItem[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("stellage-study-pomodoro-")) {
                const boxId = key.replace("stellage-study-pomodoro-", "");
                try {
                    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
                    const notesKey = `stellage-study-notes-${boxId}`;
                    const hasNotes = !!localStorage.getItem(notesKey);
                    sessions.push({
                        boxId,
                        timeLeft: parsed.timeLeft ?? focusTimerMinutes * 60,
                        totalDuration: parsed.totalDuration ?? focusTimerMinutes * 60,
                        isRunning: !!parsed.isRunning,
                        hasNotes,
                    });
                } catch {
                    // ignore
                }
            }
        }
        setActiveSessions(sessions);
    }, [focusTimerMinutes]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    const statusCounts = Object.values(cellStatuses).reduce((acc, status) => {
        if (status) acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    if (!studyModeEnabled) {
        return (
            <div className="study-dashboard-disabled">
                <div className="study-disabled-card">
                    <SparklesIcon size={40} />
                    <h2>Учебный режим отключён</h2>
                    <p>
                        Включите Учебный Режим в настройках интерфейса, чтобы получить доступ к
                        пространственному дашборду, фокус-сессиям Pomodoro и семестровой сетке.
                    </p>
                    <button
                        type="button"
                        className="study-dashboard-btn primary"
                        onClick={() => navigate("/settings")}
                    >
                        Перейти в настройки
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="study-dashboard">
            {/* Hero Header */}
            <div className="study-hero">
                <div className="study-hero-content">
                    <div className="study-hero-badge">
                        <GraduationCapIcon size={14} />
                        <span>Stellage Spatial OS · Study Mode</span>
                    </div>
                    <h1 className="study-hero-title">Учебный Дашборд</h1>
                    <p className="study-hero-sub">
                        Пространственная карта ваших учебных процессов, предметов и фокус-сессий.
                    </p>
                </div>

                <div className="study-hero-actions">
                    <button
                        type="button"
                        className="study-dashboard-btn secondary"
                        onClick={() => navigate("/my-stellage")}
                    >
                        <BoxIcon size={16} />
                        <span>Открыть Стеллаж</span>
                    </button>
                    <button
                        type="button"
                        className="study-dashboard-btn primary"
                        onClick={() => navigate("/create-box")}
                    >
                        <SparklesIcon size={16} />
                        <span>Создать Учебную Коробку</span>
                    </button>
                </div>
            </div>

            {/* Exam Countdown Banner */}
            <ExamCountdownWidget
                subjectName={colLabels[0] || "Высшая Математика"}
                targetDays={14}
                completedCount={statusCounts.done || 1}
                totalCount={5}
            />

            {/* Metrics Row */}
            <div className="study-stats-grid">
                <div className="study-stat-card">
                    <div className="stat-card-header">
                        <ClockIcon size={16} className="stat-icon" />
                        <span className="stat-title">Активные Сессии</span>
                    </div>
                    <span className="stat-value">{activeSessions.length}</span>
                    <span className="stat-desc">сохранённых Pomodoro сессий</span>
                </div>
                <div className="study-stat-card">
                    <div className="stat-card-header">
                        <FlameIcon size={16} className="stat-icon urgent" />
                        <span className="stat-title">«Горит сегодня»</span>
                    </div>
                    <span className="stat-value urgent">{statusCounts.urgent || 0}</span>
                    <span className="stat-desc">срочных ячеек на доске</span>
                </div>
                <div className="study-stat-card">
                    <div className="stat-card-header">
                        <CalendarIcon size={16} className="stat-icon warning" />
                        <span className="stat-title">«На неделю»</span>
                    </div>
                    <span className="stat-value warning">{statusCounts["this-week"] || 0}</span>
                    <span className="stat-desc">ячеек со статусом «На эту неделю»</span>
                </div>
                <div className="study-stat-card">
                    <div className="stat-card-header">
                        <CheckCircleIcon size={16} className="stat-icon success" />
                        <span className="stat-title">Выполнено</span>
                    </div>
                    <span className="stat-value success">{statusCounts.done || 0}</span>
                    <span className="stat-desc">завершённых модулей</span>
                </div>
            </div>

            {/* 7-Day Focus Streak Activity Tracker */}
            <FocusStreakWidget />

            {/* Main Content Layout */}
            <div className="study-dashboard-layout">
                {/* Left Column: Active Focus Sessions */}
                <div className="study-section">
                    <h2 className="study-section-title">
                        <HistoryIcon size={18} />
                        <span>Фокус-Сессии & Недавние Модули</span>
                    </h2>

                    {activeSessions.length === 0 ? (
                        <div className="study-empty-sessions">
                            <p>У вас пока нет активных сессий. Откройте любую коробку и запустите Focus Mode!</p>
                        </div>
                    ) : (
                        <div className="study-sessions-list">
                            {activeSessions.map((session) => (
                                <div key={session.boxId} className="study-session-card">
                                    <div className="session-card-info">
                                        <div className="session-box-icon">
                                            <WireframeBox size={40} color="#4FA98E" />
                                        </div>
                                        <div className="session-text">
                                            <span className="session-title">Фокус-сессия коробки</span>
                                            <span className="session-timer">Осталось: {formatTime(session.timeLeft)}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="study-dashboard-btn primary small"
                                        onClick={() => navigate(`/study/focus/${session.boxId}`)}
                                    >
                                        <span>Focus Mode</span>
                                        <ExternalLinkIcon size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Mini Semester Shelf Map */}
                <div className="study-section">
                    <h2 className="study-section-title">
                        <BoxIcon size={18} />
                        <span>Семестровая Карта Стеллажа</span>
                    </h2>
                    <div className="study-shelf-preview-container">
                        {mainShelf ? (
                            <ShelfBoard
                                boxes={mainShelf.boxes || []}
                                editable={false}
                                rowCount={3}
                                colCount={4}
                                studyLabels={{
                                    rowLabels,
                                    colLabels,
                                    cellStatuses,
                                }}
                            />
                        ) : (
                            <div className="study-empty-sessions">
                                <p>Загрузка стеллажа…</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
