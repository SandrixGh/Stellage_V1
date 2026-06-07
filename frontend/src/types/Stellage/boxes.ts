export interface BoxTemplate {
    id: string;
    title: string;
    description: string;
    price: string;
    currency: string;
    rarity: string;
    created_at: string;
    updated_at: string;
}

export interface Box {
    id: string;
    user_id: string;
    shelf_id: string;
    template_id: string;
    serial_number: number;
    is_sealed: 'sealed' | 'unsealed'; // строго типизируем статусы
    is_public: 'public' | 'private';
    is_verified: 'verified' | 'not verified';
    content: {
        additionalProp1?: {
            message?: string;
        };
        [key: string]: any; // на случай, если структура контента будет меняться
    };
    template: BoxTemplate; // Вложенный объект, который пришел через joinedload
    created_at: string;
    updated_at: string;
}