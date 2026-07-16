export interface BoxTemplate {
    id: string;
    title: string;
    description: string;
    price: string;
    currency: string;
    rarity: string;
    // Тип контента коробки: photo | video | text | file | app | script | hybrid.
    // Рисует глиф на передней грани куба (что внутри видно сразу на полке).
    contentType?: string | null;
    // Автор коробки: username/имя создателя, либо null для коробок платформы.
    owner_username?: string | null;
    // id создателя — фронт сравнивает с текущим юзером, чтобы показать
    // редактирование (доступно только создателю коробки). null = коробка платформы.
    creator_id?: string | null;
    created_at: string;
    updated_at: string;
}

// Типизированный текстовый контент коробки. Бинарный контент (фото/видео)
// хранится в S3 и приходит отдельным списком ассетов (box_assets).
export interface BoxContent {
    text?: string | null;
}

export type AssetKind = "photo" | "video";

// Тип наполнения коробки — вычисляется бэкендом из реального содержимого
// (текст + ассеты), а не хранится. Рисует глиф на грани куба. "empty" — коробка
// пуста ЛИБО контент скрыт правилом видимости.
export type BoxContentType = "empty" | "text" | "photo" | "video" | "mixed";

// Метаданные S3-ассета коробки. Ни ключей, ни ссылок здесь нет — presigned
// URL запрашивается отдельно через /boxes/get-asset-url и живёт минуты.
export interface BoxAsset {
    id: string;
    kind: AssetKind;
    mime: string;
    size_bytes: number;
    original_name: string;
    created_at: string;
}

export interface Box {
    id: string;
    user_id: string;
    shelf_id: string | null; // null = коробка в инвентаре, не на полке
    template_id: string;
    serial_number: number;
    shelf_row: number | null; // позиция на стеллаже: индекс полки-линии
    shelf_col: number | null; // позиция на стеллаже: индекс слота в ряду
    is_sealed: 'sealed' | 'not sealed'; // значения бэкенд-энума SealingEnum
    is_public: 'public' | 'private';
    is_verified: 'verified' | 'not verified';
    // null и для пустых коробок, и когда контент скрыт правилом видимости
    // (чужая sealed/private коробка на публичной полке).
    content: BoxContent | null;
    // READY-ассеты коробки; пустой список и когда их нет, и когда контент
    // скрыт правилом видимости.
    assets: BoxAsset[];
    // Тип наполнения, посчитанный бэкендом из реального содержимого коробки.
    // Источник истины для глифа на кубе (в отличие от хэш-фолбэка по id).
    content_type: BoxContentType;
    template: BoxTemplate; // Вложенный объект, который пришел через joinedload
    created_at: string;
    updated_at: string;
}