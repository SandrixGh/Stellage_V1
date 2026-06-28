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

const MOCK_TEMPLATES: BoxTemplate[] = [
    { id: "1",  title: "Sunset Collection",    description: "Коллекция закатных фотографий в высоком разрешении",   price: "29.99",  currency: "usd", rarity: "Golden",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "2",  title: "Base Template",        description: "Стартовый набор для каждого пользователя",             price: "0",      currency: "usd", rarity: "Common",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "3",  title: "Rare Artifacts",       description: "Редкие артефакты и исторические находки",              price: "99.99",  currency: "usd", rarity: "Rare",        created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "4",  title: "Developer's Kit",      description: "Специальный набор инструментов для разработчиков",     price: "199.99", currency: "usd", rarity: "Developer's", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "5",  title: "Cosmic Dreams",        description: "Визуальное путешествие через космос",                  price: "49.99",  currency: "usd", rarity: "Golden",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "6",  title: "Urban Sketches",       description: "Набор городских зарисовок и архитектурных этюдов",     price: "19.99",  currency: "usd", rarity: "Common",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "7",  title: "Nature's Wonders",     description: "Самые красивые уголки дикой природы планеты",          price: "74.99",  currency: "usd", rarity: "Rare",        created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "8",  title: "Golden Age",           description: "Исторические золотые эпохи цивилизации",               price: "149.99", currency: "usd", rarity: "Golden",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "9",  title: "Sound Waves",          description: "Эксклюзивные звуковые текстуры и аудио-арт",           price: "12.99",  currency: "usd", rarity: "Common",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "10", title: "Pixel Legends",        description: "Пиксельные иллюстрации в ретро-стиле",                 price: "39.99",  currency: "eur", rarity: "Rare",        created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "11", title: "Aurora Bundle",        description: "Северное сияние — пейзажи и абстракции",               price: "89.99",  currency: "usd", rarity: "Golden",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "12", title: "Code Scrolls",         description: "Редкие алгоритмы и программные артефакты",             price: "299.00", currency: "usd", rarity: "Developer's", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "13", title: "Street Art Pack",      description: "Граффити и муралы ведущих городских художников",        price: "0",      currency: "usd", rarity: "Common",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "14", title: "Deep Sea",             description: "Биолюминесцентные существа абиссальных глубин",         price: "64.99",  currency: "usd", rarity: "Rare",        created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "15", title: "Alchemist's Vault",    description: "Секретные формулы и схемы средневековых алхимиков",    price: "124.99", currency: "gbp", rarity: "Golden",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "16", title: "Glitch Lab",           description: "Экспериментальные глитч-арт текстуры",                 price: "9.99",   currency: "usd", rarity: "Common",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "17", title: "Nebula Series",        description: "Туманности и звёздные скопления в высоком разрешении", price: "54.99",  currency: "usd", rarity: "Rare",        created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "18", title: "Open Source Kit",      description: "Открытые инструменты для разработки и деплоя",         price: "0",      currency: "usd", rarity: "Developer's", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "19", title: "Wabi-Sabi",            description: "Японская эстетика несовершенства и мимолётности",      price: "34.99",  currency: "jpy", rarity: "Common",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "20", title: "Crown Jewels",         description: "Ультра-редкая коллекция цифровых сокровищ",            price: "499.99", currency: "usd", rarity: "Golden",      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const rarityGlowMap: Record<string, "rare" | "golden" | "dev" | null> = {
    rare: "rare",
    golden: "golden",
    "developer's": "dev",
    dev: "dev",
};

const rarityBoxColorMap: Record<string, string> = {
    common: "#D7D0B7",
    rare: "#8BB8FF",
    golden: "#E8CB82",
    dev: "#C882FF",
};

const getRarityClass = (rarity: string) =>
    rarity.toLowerCase().replace(/[^a-z0-9]/g, "");

const TemplateCard = ({ template }: { template: BoxTemplate }) => {
    const rarityKey = template.rarity?.toLowerCase() ?? "common";
    const rarityGlow = rarityGlowMap[rarityKey] ?? null;
    const rarityClass = getRarityClass(template.rarity ?? "common");
    const boxColor = rarityBoxColorMap[rarityClass] ?? rarityBoxColorMap[rarityGlow ?? ""] ?? "#D7D0B7";

    return (
        <div className={`template-card rarity-${rarityClass}`}>
            <div className="template-card-header">
                <span className={`rarity-tag rarity-tag-${rarityClass}`}>{template.rarity}</span>
                <span className="template-price">
                    {formatPrice(template.price, template.currency)}
                </span>
            </div>

            <div className="template-card-visual">
                <WireframeBox size={120} rarityGlow={rarityGlow} color={boxColor} />
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
    const { templates, fetchTemplates, isLoading } = useStellageStore();
    const displayTemplates = templates.length > 0 ? templates : MOCK_TEMPLATES;

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    return (
        <div className="feed-page">
            <h1 className="page-title">Лента</h1>
            <p className="page-subtitle">Все доступные коробки платформы</p>

            {isLoading && <div className="status-info">Загрузка ленты...</div>}

            {!isLoading && (
                <div className="feed-grid">
                    {displayTemplates.length > 0 ? (
                        displayTemplates.map((t) => <TemplateCard key={t.id} template={t} />)
                    ) : (
                        <p className="empty-message">В ленте пока нет коробок.</p>
                    )}
                </div>
            )}
        </div>
    );
};
