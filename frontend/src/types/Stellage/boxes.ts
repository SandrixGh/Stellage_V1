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

export interface Box {
    id: string;
    user_id: string;
    shelf_id: string | null; // null = коробка в инвентаре, не на полке
    template_id: string;
    serial_number: number;
    shelf_row: number | null; // позиция на стеллаже: индекс полки-линии
    shelf_col: number | null; // позиция на стеллаже: индекс слота в ряду
    is_sealed: 'sealed' | 'unsealed'; // строго типизируем статусы
    is_public: 'public' | 'private';
    is_verified: 'verified' | 'not verified';
    content: Record<string, unknown>;
    template: BoxTemplate; // Вложенный объект, который пришел через joinedload
    created_at: string;
    updated_at: string;
}