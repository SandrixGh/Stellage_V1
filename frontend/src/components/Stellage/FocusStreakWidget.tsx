import { FlameIcon, ClockIcon } from "../UI/Icons";
import "./FocusStreakWidget.css";

interface DayActivity {
    dayLabel: string;
    minutes: number;
}

const DEFAULT_WEEK: DayActivity[] = [
    { dayLabel: "Пн", minutes: 50 },
    { dayLabel: "Вт", minutes: 75 },
    { dayLabel: "Ср", minutes: 25 },
    { dayLabel: "Чт", minutes: 100 },
    { dayLabel: "Пт", minutes: 60 },
    { dayLabel: "Сб", minutes: 45 },
    { dayLabel: "Вс", minutes: 90 },
];

export const FocusStreakWidget = () => {
    const weekData = DEFAULT_WEEK;
    const totalMinutes = weekData.reduce((acc, d) => acc + d.minutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const streakDays = 7;
    const maxMinutes = Math.max(...weekData.map((d) => d.minutes), 1);

    return (
        <div className="focus-streak-widget">
            <div className="focus-streak-header">
                <div className="streak-title-badge">
                    <FlameIcon size={16} className="streak-flame-icon" />
                    <span>Focus Streak: {streakDays} дн. подрят</span>
                </div>
                <div className="streak-total-time">
                    <ClockIcon size={14} />
                    <span>{totalHours} ч. за неделю</span>
                </div>
            </div>

            {/* 7-Day Activity Bar */}
            <div className="focus-heatmap-bars">
                {weekData.map((item, idx) => {
                    const heightPct = Math.round((item.minutes / maxMinutes) * 100);
                    return (
                        <div key={`day-${idx}`} className="heatmap-col" title={`${item.dayLabel}: ${item.minutes} мин`}>
                            <div className="heatmap-bar-container">
                                <div className="heatmap-bar-fill" style={{ height: `${heightPct}%` }} />
                            </div>
                            <span className="heatmap-day-name">{item.dayLabel}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
