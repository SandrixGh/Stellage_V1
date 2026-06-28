import type { BoxTemplate } from "../types/Stellage/boxes";

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock box data + rarity/price helpers.

   Temporary placeholder data while the box catalogue is wired to the backend.
   Both the Feed (FeedPage) and the Box detail page (BoxDetailPage) read from
   here so ids stay consistent across navigation.
   ────────────────────────────────────────────────────────────────────────── */

const now = () => new Date().toISOString();

const t = (
    id: string,
    title: string,
    description: string,
    price: string,
    currency: string,
    rarity: string,
): BoxTemplate => ({
    id,
    title,
    description,
    price,
    currency,
    rarity,
    created_at: now(),
    updated_at: now(),
});

export const MOCK_TEMPLATES: BoxTemplate[] = [
    t("1",  "Sunset Collection",   "Коллекция закатных фотографий в высоком разрешении",        "29.99",  "usd", "Golden"),
    t("2",  "Base Template",       "Стартовый набор для каждого пользователя",                  "0",      "usd", "Common"),
    t("3",  "Rare Artifacts",      "Редкие артефакты и исторические находки",                   "99.99",  "usd", "Rare"),
    t("4",  "Developer's Kit",     "Специальный набор инструментов для разработчиков",          "199.99", "usd", "Developer's"),
    t("5",  "Cosmic Dreams",       "Визуальное путешествие через космос",                       "49.99",  "usd", "Golden"),
    t("6",  "Urban Sketches",      "Набор городских зарисовок и архитектурных этюдов",          "19.99",  "usd", "Common"),
    t("7",  "Nature's Wonders",    "Самые красивые уголки дикой природы планеты",               "74.99",  "usd", "Rare"),
    t("8",  "Golden Age",          "Исторические золотые эпохи цивилизации",                    "149.99", "usd", "Golden"),
    t("9",  "Sound Waves",         "Эксклюзивные звуковые текстуры и аудио-арт",                "12.99",  "usd", "Common"),
    t("10", "Pixel Legends",       "Пиксельные иллюстрации в ретро-стиле",                      "39.99",  "eur", "Rare"),
    t("11", "Aurora Bundle",       "Северное сияние — пейзажи и абстракции",                    "89.99",  "usd", "Golden"),
    t("12", "Code Scrolls",        "Редкие алгоритмы и программные артефакты",                  "299.00", "usd", "Developer's"),
    t("13", "Street Art Pack",     "Граффити и муралы ведущих городских художников",            "0",      "usd", "Common"),
    t("14", "Deep Sea",            "Биолюминесцентные существа абиссальных глубин",             "64.99",  "usd", "Rare"),
    t("15", "Alchemist's Vault",   "Секретные формулы и схемы средневековых алхимиков",         "124.99", "gbp", "Golden"),
    t("16", "Glitch Lab",          "Экспериментальные глитч-арт текстуры",                      "9.99",   "usd", "Common"),
    t("17", "Nebula Series",       "Туманности и звёздные скопления в высоком разрешении",       "54.99",  "usd", "Rare"),
    t("18", "Open Source Kit",     "Открытые инструменты для разработки и деплоя",              "0",      "usd", "Developer's"),
    t("19", "Wabi-Sabi",           "Японская эстетика несовершенства и мимолётности",           "34.99",  "jpy", "Common"),
    t("20", "Crown Jewels",        "Ультра-редкая коллекция цифровых сокровищ",                 "499.99", "usd", "Golden"),
    t("21", "Neon Districts",      "Киберпанк-город в неоновом свечении",                       "44.99",  "usd", "Rare"),
    t("22", "Field Notes",         "Минималистичные заметки и наброски",                        "4.99",   "usd", "Common"),
    t("23", "Quantum Toolkit",     "Экспериментальные квантовые алгоритмы",                     "349.99", "usd", "Developer's"),
    t("24", "Marble Halls",        "Архитектура классических мраморных интерьеров",             "79.99",  "eur", "Golden"),
    t("25", "Lo-Fi Tapes",         "Тёплые ламповые звуки и зацикленные биты",                  "14.99",  "usd", "Common"),
    t("26", "Frostbite",           "Макросъёмка льда и зимних кристаллов",                      "59.99",  "usd", "Rare"),
    t("27", "Solar Flare",         "Снимки солнечной короны и протуберанцев",                   "169.99", "usd", "Golden"),
    t("28", "Daily Doodles",       "Повседневные дудлы и быстрые скетчи",                       "0",      "usd", "Common"),
    t("29", "Tide Pools",          "Жизнь прибрежных приливных бассейнов",                      "47.50",  "usd", "Rare"),
    t("30", "Compiler Secrets",    "Редкие приёмы оптимизации компиляторов",                    "279.00", "usd", "Developer's"),
    t("31", "Velvet Hours",        "Атмосферная вечерняя фотография в тёплых тонах",             "109.99", "usd", "Golden"),
    t("32", "Paper Textures",      "Набор бумажных и картонных текстур",                        "7.99",   "usd", "Common"),
    t("33", "Storm Front",         "Драматичные кадры гроз и штормового неба",                  "69.99",  "usd", "Rare"),
    t("34", "Royal Archive",       "Цифровая реконструкция королевских регалий",                "459.99", "gbp", "Golden"),
    t("35", "Shader Garden",       "Коллекция процедурных шейдеров и эффектов",                 "229.99", "usd", "Developer's"),
];

/* ── Extra per-box metadata, keyed by template id — owner / shelf / visibility.
   Used by the box detail page. Some boxes intentionally have no shelf and some
   are private to demonstrate both states. ── */
export interface BoxExtra {
    owner: string;
    stellage: string | null;
    is_public: "public" | "private";
}

export const MOCK_BOX_EXTRAS: Record<string, BoxExtra> = {
    "1":  { owner: "atlas",      stellage: "Закаты и горизонты",   is_public: "public" },
    "2":  { owner: "stellage",   stellage: null,                   is_public: "public" },
    "3":  { owner: "curator_v",  stellage: "Археология",           is_public: "private" },
    "4":  { owner: "devguild",   stellage: "Инструменты",          is_public: "public" },
    "5":  { owner: "nova",       stellage: "Космос",               is_public: "public" },
    "6":  { owner: "sketcher",   stellage: null,                   is_public: "public" },
    "7":  { owner: "wildlens",   stellage: "Дикая природа",        is_public: "public" },
    "8":  { owner: "historia",   stellage: "Золотой век",          is_public: "private" },
    "9":  { owner: "waveform",   stellage: null,                   is_public: "public" },
    "10": { owner: "retro8",     stellage: "Ретро",               is_public: "public" },
    "11": { owner: "nova",       stellage: "Космос",               is_public: "public" },
    "12": { owner: "devguild",   stellage: "Артефакты кода",        is_public: "private" },
    "13": { owner: "mural",      stellage: null,                   is_public: "public" },
    "14": { owner: "abyss",      stellage: "Глубины",              is_public: "public" },
    "15": { owner: "alchemy",    stellage: "Тайные знания",         is_public: "private" },
    "16": { owner: "glitch",     stellage: null,                   is_public: "public" },
    "17": { owner: "nova",       stellage: "Космос",               is_public: "public" },
    "18": { owner: "opensrc",    stellage: "Open Source",          is_public: "public" },
    "19": { owner: "kintsugi",   stellage: "Wabi-Sabi",            is_public: "public" },
    "20": { owner: "regalia",    stellage: "Сокровищница",          is_public: "private" },
    "21": { owner: "neon",       stellage: "Киберпанк",            is_public: "public" },
    "22": { owner: "minimal",    stellage: null,                   is_public: "public" },
    "23": { owner: "devguild",   stellage: "Эксперименты",          is_public: "private" },
    "24": { owner: "classix",    stellage: "Классика",            is_public: "public" },
    "25": { owner: "lofi",       stellage: null,                   is_public: "public" },
    "26": { owner: "frost",      stellage: "Зима",                is_public: "public" },
    "27": { owner: "nova",       stellage: "Космос",               is_public: "private" },
    "28": { owner: "doodler",    stellage: null,                   is_public: "public" },
    "29": { owner: "tidal",      stellage: "Океан",               is_public: "public" },
    "30": { owner: "devguild",   stellage: "Артефакты кода",        is_public: "private" },
    "31": { owner: "velvet",     stellage: "Вечер",               is_public: "public" },
    "32": { owner: "paperco",    stellage: null,                   is_public: "public" },
    "33": { owner: "stormchase", stellage: "Стихии",              is_public: "public" },
    "34": { owner: "regalia",    stellage: "Сокровищница",          is_public: "private" },
    "35": { owner: "devguild",   stellage: "Шейдеры",             is_public: "public" },
};

/* ── Rarity helpers (shared by feed + detail) ── */
export const CURRENCY_SIGN: Record<string, string> = {
    usd: "$", eur: "€", gbp: "£", rub: "₽",
    cny: "¥", jpy: "¥", kzt: "₸", byn: "Br", try: "₺",
};

export const formatPrice = (price: string, currency: string): string => {
    const sign = CURRENCY_SIGN[currency?.toLowerCase()] ?? "";
    const value = Number(price);
    if (!value) return "Бесплатно";
    return `${value.toFixed(2)} ${sign}`.trim();
};

export const rarityGlowMap: Record<string, "rare" | "golden" | "dev" | null> = {
    rare: "rare",
    golden: "golden",
    "developer's": "dev",
    dev: "dev",
};

export const rarityBoxColorMap: Record<string, string> = {
    common: "#D7D0B7",
    rare: "#8BB8FF",
    golden: "#E8CB82",
    dev: "#C882FF",
};

/** Normalise a rarity label into a css-class-safe token: "Developer's" → "developers". */
export const getRarityClass = (rarity: string): string =>
    rarity.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Resolve the WireframeBox glow + color for a given rarity label. */
export const resolveRarityVisual = (rarity: string) => {
    const rarityKey = rarity?.toLowerCase() ?? "common";
    const rarityGlow = rarityGlowMap[rarityKey] ?? null;
    const rarityClass = getRarityClass(rarity ?? "common");
    const boxColor =
        rarityBoxColorMap[rarityClass] ??
        rarityBoxColorMap[rarityGlow ?? ""] ??
        "#D7D0B7";
    return { rarityGlow, rarityClass, boxColor };
};
