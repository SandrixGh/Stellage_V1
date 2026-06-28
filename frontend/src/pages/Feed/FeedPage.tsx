import { useEffect } from "react";
import { useStellageStore } from "../../store/useStellageStore";
import type { BoxTemplate } from "../../types/Stellage/boxes";
import "./FeedPage.css";

const CURRENCY_SIGN: Record<string, string> = {
    usd: "$", eur: "€", gbp: "£", rub: "₽",
    cny: "¥", jpy: "¥", kzt: "₸", byn: "Br", try: "₺",
};

const formatPrice = (price: string, currency: string) => {
    const sign = CURRENCY_SIGN[currency?.toLowerCase()] ?? "";
    const value = Number(price);
    if (!value) return "Бесплатно";
    return `${value.toFixed(2)} ${sign}`.trim();
};

const TemplateCard = ({ template }: { template: BoxTemplate }) => {
    const rarity = template.rarity?.toLowerCase();
    return (
        <div className={`template-card rarity-${rarity}`}>
            <div className="template-icon">📦</div>
            <span className={`rarity-tag rarity-tag-${rarity}`}>{template.rarity}</span>
            <h3 className="template-title">{template.title}</h3>
            {template.description && (
                <p className="template-desc">{template.description}</p>
            )}
            <div className="template-price">
                {formatPrice(template.price, template.currency)}
            </div>
        </div>
    );
};

export const FeedPage = () => {
    const { templates, fetchTemplates, isLoading, error } = useStellageStore();

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    return (
        <div className="feed-page">
            <h1 className="page-title">Лента</h1>
            <p className="page-subtitle">Все доступные коробки платформы</p>

            {isLoading && <div className="status-info">Загрузка ленты...</div>}
            {error && <div className="status-info error">{error}</div>}

            {!isLoading && !error && (
                <div className="feed-grid">
                    {templates.length > 0 ? (
                        templates.map((t) => <TemplateCard key={t.id} template={t} />)
                    ) : (
                        <p className="empty-message">В ленте пока нет коробок.</p>
                    )}
                </div>
            )}
        </div>
    );
};
