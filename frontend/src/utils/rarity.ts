/** Сопоставление редкости коробки со свечением wireframe (см. WireframeBox). */
export const rarityGlow = (rarity?: string | null): "rare" | "golden" | "dev" | null => {
    switch ((rarity ?? "").toLowerCase()) {
        case "rare":
            return "rare";
        case "golden":
            return "golden";
        case "developer's":
        case "dev":
            return "dev";
        default:
            return null;
    }
};

/** Нормализованный ключ редкости для css-классов (rarity-tag-...). */
export const rarityKey = (rarity?: string | null): string => (rarity ?? "").toLowerCase();
