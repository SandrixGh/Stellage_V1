import type { ReactNode } from "react";

/**
 * Глифы типа контента коробки. Каждый нарисован в сетке 24×24 монолинией
 * (stroke="currentColor"), центрирован в (12,12). WireframeBox размещает глиф
 * на передней грани куба и красит его цветом редкости (currentColor) — так
 * коробка сразу «рассказывает», что внутри: фото, видео, текст, файл,
 * приложение, скрипт или гибрид.
 *
 * Передняя грань проектируется как «холст»: сейчас на ней глиф типа, позже
 * редактор дорогих коробок доложит сюда бейдж/автограф (см. BOX_EDITOR_IDEA.md).
 */
export type ContentType =
    | "photo"
    | "video"
    | "text"
    | "file"
    | "app"
    | "script"
    | "hybrid"
    // Типы, которые отдаёт бэкенд (box_content_type): mixed ≈ hybrid,
    // empty — контента нет (или он скрыт), глиф не рисуем.
    | "mixed"
    | "empty";

const GLYPHS: Record<ContentType, ReactNode> = {
    // Фото — рамка с «солнцем» и линией гор.
    photo: (
        <>
            <rect x="4" y="6" width="16" height="13" rx="2" />
            <circle cx="9" cy="11" r="1.6" />
            <path d="M5 18l4.5-4.5 3 3L16 12l3 3.5" />
        </>
    ),
    // Видео — экран с треугольником play.
    video: (
        <>
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M11 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
        </>
    ),
    // Текст — абзац из строк.
    text: (
        <>
            <path d="M6 8h12" />
            <path d="M6 12h12" />
            <path d="M6 16h7" />
        </>
    ),
    // Файл — документ с загнутым углом.
    file: (
        <>
            <path d="M7 4h6l4 4v12H7z" />
            <path d="M13 4v4h4" />
        </>
    ),
    // Приложение — сетка иконок 2×2.
    app: (
        <>
            <rect x="5" y="5" width="6" height="6" rx="1.4" />
            <rect x="13" y="5" width="6" height="6" rx="1.4" />
            <rect x="5" y="13" width="6" height="6" rx="1.4" />
            <rect x="13" y="13" width="6" height="6" rx="1.4" />
        </>
    ),
    // Скрипт — угловые скобки кода.
    script: (
        <>
            <path d="M9 8l-4 4 4 4" />
            <path d="M15 8l4 4-4 4" />
        </>
    ),
    // Гибрид — два слоя внахлёст.
    hybrid: (
        <>
            <rect x="5" y="6" width="10" height="10" rx="2" />
            <rect x="9" y="10" width="10" height="10" rx="2" />
        </>
    ),
    // Смешанный контент (бэкенд) — тот же глиф «два слоя», что и hybrid.
    mixed: (
        <>
            <rect x="5" y="6" width="10" height="10" rx="2" />
            <rect x="9" y="10" width="10" height="10" rx="2" />
        </>
    ),
    // Пусто — глифа нет; грань куба остаётся чистой.
    empty: null,
};

/** Вернуть элементы глифа для типа контента (или null, если тип неизвестен/не задан). */
export const getContentGlyph = (type?: string | null): ReactNode => {
    if (!type) return null;
    const key = type.toLowerCase() as ContentType;
    return GLYPHS[key] ?? null;
};
