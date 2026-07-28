

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock box data + rarity/price helpers.

   Temporary placeholder data while the box catalogue is wired to the backend.
   Both the Feed (FeedPage) and the Box detail page (BoxDetailPage) read from
   here so ids stay consistent across navigation.
   ────────────────────────────────────────────────────────────────────────── */



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

// Reference CSS custom properties (defined per-theme in styles/theme.css) so
// the wireframe box recolors automatically when the theme toggles — no
// re-render or theme-awareness needed here.
export const rarityBoxColorMap: Record<string, string> = {
    common: "var(--box-common)",
    rare: "var(--box-rare)",
    golden: "var(--box-golden)",
    dev: "var(--box-dev)",
};

/** Normalise a rarity label into a css-class-safe token: "Developer's" → "developers". */
export const getRarityClass = (rarity: string): string =>
    rarity.toLowerCase().replace(/[^a-z0-9]/g, "");

const CONTENT_TYPES = ["photo", "video", "text", "file", "app", "script", "hybrid"] as const;

/**
 * Тип контента коробки для глифа на грани. Если бэкенд ещё не отдаёт contentType,
 * даём детерминированный фолбэк по id — чтобы КАЖДАЯ коробка показывала глиф
 * (что внутри), а полка читалась разнообразно и стабильно между перезагрузками.
 */
export const resolveContentType = (
    template: { id?: string; contentType?: string | null },
): string => {
    if (template.contentType) return template.contentType;
    const id = template.id ?? "";
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return CONTENT_TYPES[h % CONTENT_TYPES.length];
};

/**
 * Тип контента для РЕАЛЬНОГО экземпляра коробки. Источник истины —
 * box.content_type с бэкенда (посчитан из настоящего наполнения). "empty"
 * пропускаем как «нет глифа», но НЕ подменяем хэшем — пустая коробка честно
 * пустая. Хэш-фолбэк по шаблону остаётся только для каталога/моков, где
 * реального контента у нас ещё нет.
 */
export const resolveBoxContentType = (box: {
    content_type?: string | null;
    template: { id?: string; contentType?: string | null };
}): string => {
    if (box.content_type) {
        return box.content_type === "empty" ? "" : box.content_type;
    }
    return resolveContentType(box.template);
};

/** Resolve the WireframeBox glow + color for a given rarity label. */
export const resolveRarityVisual = (rarity: string) => {
    const rarityKey = rarity?.toLowerCase() ?? "common";
    const rarityGlow = rarityGlowMap[rarityKey] ?? null;
    const rarityClass = getRarityClass(rarity ?? "common");
    const boxColor =
        rarityBoxColorMap[rarityClass] ??
        rarityBoxColorMap[rarityGlow ?? ""] ??
        "var(--box-common)";
    return { rarityGlow, rarityClass, boxColor };
};
