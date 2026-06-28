import { useEffect } from "react";
import { useStellageStore } from "../../store/useStellageStore";
import type { BoxTemplate } from "../../types/Stellage/boxes";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
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

const rarityGlowMap: Record<string, "rare" | "golden" | "dev" | null> = {
    rare: "rare",
    golden: "golden",
    "developer's": "dev",
    dev: "dev",
};

const TemplateCard = ({ template }: { template: BoxTemplate }) => {
    const rarityKey = template.rarity?.toLowerCase();
    const rarityGlow = rarityGlowMap[rarityKey] ?? null;

    return (
        <div className={`template-card rarity-${rarityKey}`}>
            <div className="template-card-header">
                <span className={`rarity-tag rarity-tag-${rarityKey}`}>{template.rarity}</span>
                <span className="template-price">
                    {formatPrice(template.price, template.currency)}
                </span>
            </div>

            <div className="template-card-visual">
                <WireframeBox size={120} rarityGlow={rarityGlow} />
            </div>

            <div className="template-card-footer">
                <h3 className="template-title">{template.title}</h3>
                {template.description && (
                    <p className="template-desc">{template.description}</p>
                )}
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
