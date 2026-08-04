import {
    SparklesIcon,
    GemIcon,
    UnsealIcon,
    BoxIcon,
    GiftIcon,
    TagIcon,
} from "../UI/Icons";
import "./BoxHistoryTimeline.css";

export interface BoxHistoryEvent {
    id: string;
    eventType: "CREATED" | "PURCHASED" | "UNSEALED" | "PLACED_ON_SHELF" | "GIFTED" | "PRICE_UPDATED" | "UPDATED";
    actorName: string;
    timestamp: string;
    details?: string;
}

interface BoxHistoryTimelineProps {
    events?: BoxHistoryEvent[];
    createdDate?: string;
    creatorUsername?: string;
    ownerUsername?: string;
    isSealed?: boolean;
    priceCoins?: number;
}

export const BoxHistoryTimeline = ({
    events,
    createdDate,
    creatorUsername = "Stellage",
    ownerUsername,
    isSealed = false,
    priceCoins = 0,
}: BoxHistoryTimelineProps) => {
    const defaultEvents: BoxHistoryEvent[] = [
        {
            id: "1",
            eventType: "CREATED",
            actorName: creatorUsername,
            timestamp: createdDate || new Date().toISOString(),
            details: `Создана оригинальная коробка (Цена: ${priceCoins} StellaCoins)`,
        },
        ...(!isSealed
            ? [
                  {
                      id: "2",
                      eventType: "UNSEALED" as const,
                      actorName: ownerUsername || creatorUsername,
                      timestamp: createdDate || new Date().toISOString(),
                      details: "Коробка успешно распечатана владельцем",
                  },
              ]
            : []),
        ...(ownerUsername && ownerUsername !== creatorUsername
            ? [
                  {
                      id: "3",
                      eventType: "PURCHASED" as const,
                      actorName: ownerUsername,
                      timestamp: new Date().toISOString(),
                      details: `Приобретена у @${creatorUsername} за ${priceCoins} StellaCoins`,
                  },
              ]
            : []),
    ];

    const timelineList: BoxHistoryEvent[] = [...(events || []), ...defaultEvents];

    const getEventBadge = (type: BoxHistoryEvent["eventType"]) => {
        switch (type) {
            case "CREATED":
                return { icon: <SparklesIcon size={16} />, label: "Создание коробки", class: "created" };
            case "PURCHASED":
                return { icon: <GemIcon size={16} />, label: "Покупка", class: "purchased" };
            case "UNSEALED":
                return { icon: <UnsealIcon size={16} />, label: "Распаковка", class: "unsealed" };
            case "PLACED_ON_SHELF":
                return { icon: <BoxIcon size={16} />, label: "На полке", class: "shelf" };
            case "GIFTED":
                return { icon: <GiftIcon size={16} />, label: "Подарок", class: "gifted" };
            case "PRICE_UPDATED":
                return { icon: <TagIcon size={16} />, label: "Цена изменена", class: "price" };
            case "UPDATED":
                return { icon: <SparklesIcon size={16} />, label: "Содержимое изменено", class: "updated" };
            default:
                return { icon: <SparklesIcon size={16} />, label: "Событие", class: "default" };
        }
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return iso;
        }
    };

    return (
        <div className="box-history-timeline">
            <div className="box-history-header">
                <div className="box-history-title">История транзакций</div>
                <div className="box-history-subtitle">Полная прозрачная история жизненного цикла и действий</div>
            </div>

            <div className="box-history-list">
                {timelineList.map((item, idx) => {
                    const badge = getEventBadge(item.eventType);
                    return (
                        <div key={item.id || idx} className="box-history-item">
                            <div className="box-history-node">
                                <span className={`box-history-icon ${badge.class}`}>{badge.icon}</span>
                                {idx < timelineList.length - 1 && <div className="box-history-line" />}
                            </div>
                            <div className="box-history-info">
                                <div className="box-history-event-head">
                                    <span className="event-type">{badge.label}</span>
                                    <span className="event-date">{formatDate(item.timestamp)}</span>
                                </div>
                                <div className="box-history-actor">
                                    Инициатор: <strong>@{item.actorName}</strong>
                                </div>
                                {item.details && <div className="box-history-details">{item.details}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
