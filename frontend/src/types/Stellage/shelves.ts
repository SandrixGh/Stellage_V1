import type { Box } from "./boxes";

export interface Shelf {
    // Основные идентификаторы
    id: string;
    user_id: string;
    
    // Контент и метаданные
    title: string;
    description?: string | null; // На будущее, если добавим описание полки
    
    // Флаги состояния (те самые, что мы закладывали в БД)
    is_main: boolean;
    is_public: boolean;
    
    // Вложенные данные (прогруженные через joinedload на бэкенде)
    boxes: Box[];
    
    // Системные поля для сортировки и истории
    created_at: string; // ISO DateTime string
    updated_at: string; // ISO DateTime string
}

export interface ShelvesResponse {
    items: Shelf[];
    total: number;
}