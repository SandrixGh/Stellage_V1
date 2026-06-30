import type { Box } from "../types/Stellage/boxes";

export type BoxSort = "date_desc" | "date_asc" | "price_desc" | "price_asc";

export interface BoxFilterOptions {
    query?: string;
    /** Активные редкости (как в template.rarity). Пусто = все. */
    rarities?: string[];
    sort?: BoxSort;
}

const toPrice = (v?: string) => {
    const n = parseFloat(v ?? "");
    return Number.isFinite(n) ? n : 0;
};

const toTime = (iso?: string) => {
    const t = Date.parse(iso ?? "");
    return Number.isFinite(t) ? t : 0;
};

/**
 * Общая фильтрация + сортировка коробок для инвентаря и модалки-пикера.
 * Поиск — по названию шаблона и серийному номеру; фильтр — по редкости;
 * сортировка — по дате добавления (created_at) или цене (template.price).
 */
export const filterBoxes = (boxes: Box[], opts: BoxFilterOptions = {}): Box[] => {
    const { query = "", rarities = [], sort = "date_desc" } = opts;
    const q = query.trim().toLowerCase();

    const filtered = boxes.filter((box) => {
        if (rarities.length > 0 && !rarities.includes(box.template.rarity)) {
            return false;
        }
        if (!q) return true;
        const title = box.template.title?.toLowerCase() ?? "";
        // Серийный номер ищем по ТОЧНОМУ совпадению (допускаем префикс «#»),
        // иначе «1» выдавал бы все коробки, чей номер просто содержит 1.
        const serialQuery = q.replace(/^#/, "");
        const serialMatch =
            /^\d+$/.test(serialQuery) && String(box.serial_number) === serialQuery;
        return title.includes(q) || serialMatch;
    });

    const sorted = [...filtered];
    switch (sort) {
        case "date_asc":
            sorted.sort((a, b) => toTime(a.created_at) - toTime(b.created_at));
            break;
        case "price_desc":
            sorted.sort((a, b) => toPrice(b.template.price) - toPrice(a.template.price));
            break;
        case "price_asc":
            sorted.sort((a, b) => toPrice(a.template.price) - toPrice(b.template.price));
            break;
        case "date_desc":
        default:
            sorted.sort((a, b) => toTime(b.created_at) - toTime(a.created_at));
            break;
    }
    return sorted;
};

export const SORT_LABELS: Record<BoxSort, string> = {
    date_desc: "Сначала новые",
    date_asc: "Сначала старые",
    price_desc: "Дороже",
    price_asc: "Дешевле",
};

/** Уникальные редкости из набора коробок (для чипов-фильтров). */
export const collectRarities = (boxes: Box[]): string[] => {
    const set = new Set<string>();
    for (const b of boxes) if (b.template.rarity) set.add(b.template.rarity);
    return [...set];
};
