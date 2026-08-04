import { CalendarIcon, TargetIcon } from "../UI/Icons";
import "./ExamCountdownWidget.css";

interface ExamCountdownWidgetProps {
    subjectName?: string;
    targetDays?: number;
    completedCount?: number;
    totalCount?: number;
}

export const ExamCountdownWidget = ({
    subjectName = "Высшая Математика",
    targetDays = 14,
    completedCount = 3,
    totalCount = 5,
}: ExamCountdownWidgetProps) => {
    const days = targetDays;
    const progressPct = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="exam-countdown-widget">
            <div className="exam-widget-left">
                <div className="exam-icon-badge">
                    <CalendarIcon size={18} />
                </div>
                <div className="exam-text-info">
                    <span className="exam-subject-name">{subjectName} · Экзаменационный Спринт</span>
                    <span className="exam-progress-sub">
                        {completedCount} из {totalCount} модулей освоено ({progressPct}%)
                    </span>
                </div>
            </div>

            <div className="exam-widget-right">
                <div className="exam-days-tag">
                    <TargetIcon size={14} />
                    <span>D-{days} дн.</span>
                </div>
                <div className="exam-mini-progress">
                    <div className="exam-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
            </div>
        </div>
    );
};
