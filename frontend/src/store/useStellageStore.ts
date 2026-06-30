import { create } from "zustand";
import { api } from "../api/instance";
import type { Shelf } from "../types/Stellage/shelves";
import type { Box, BoxTemplate } from "../types/Stellage/boxes";

/** Данные формы создания пользовательской коробки.
 *  rarity применяется только для суперюзеров (обычным форсится Common на бэке). */
export interface CreateBoxInput {
    title: string;
    description?: string;
    price?: number;
    currency?: string;
    content?: Record<string, unknown>;
    rarity?: string;
}

/** Частичное редактирование коробки владельцем. Любое поле опционально —
 *  меняется только переданное (поля шаблона правит лишь создатель коробки). */
export interface UpdateBoxInput {
    title?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    rarity?: string;
    content?: Record<string, unknown> | null;
}

interface StellageState {
    shelves: Shelf[];
    mainShelf: Shelf | null;
    selectedShelf: Shelf | null;
    publicShelf: Shelf | null;
    currentBoxes: Box[];
    templates: BoxTemplate[];
    instances: Box[];
    isLoading: boolean;
    error: string | null;

    fetchShelves: () => Promise<void>;
    fetchMainShelf: () => Promise<void>;
    fetchShelfWithBoxes: (shelfId: string) => Promise<void>;
    fetchPublicShelf: (shelfId: string) => Promise<void>;
    fetchTemplates: () => Promise<void>;
    fetchInstances: () => Promise<void>;

    createShelf: (title: string, isPublic: boolean) => Promise<Shelf | null>;
    setMainShelf: (shelfId: string) => Promise<void>;
    acquireBox: (templateId: string) => Promise<void>;
    createBox: (data: CreateBoxInput) => Promise<Box | null>;
    updateBox: (instanceId: string, data: UpdateBoxInput) => Promise<Box | null>;

    moveBox: (instanceId: string, shelfId: string | null) => Promise<void>;
    updateBoxPosition: (instanceId: string, shelf_row: number, shelf_col: number, shelfId?: string) => Promise<void>;
    deleteBox: (instanceId: string) => Promise<void>;

    /** Сбросить всё пользовательское состояние (вызывается при смене аккаунта). */
    reset: () => void;
}

// Изолируем дефолтные значения, чтобы reset() возвращал стор к чистому виду
// и данные прошлого аккаунта не «протекали» в профиль нового пользователя.
const INITIAL_STATE = {
    shelves: [],
    mainShelf: null,
    selectedShelf: null,
    publicShelf: null,
    currentBoxes: [],
    templates: [],
    instances: [],
    isLoading: false,
    error: null,
};

export const useStellageStore = create<StellageState>((set, get) => ({
    ...INITIAL_STATE,

    reset: () => set({ ...INITIAL_STATE }),

    fetchShelves: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get<Shelf[]>("/shelf/get-shelves");
            set({ shelves: res.data, isLoading: false });
        } catch (err: any) {
            set({ error: "Ошибка загрузки полок", isLoading: false });
        }
    },

    fetchMainShelf: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get<Shelf>("/shelf/main-shelf-with-boxes");
            set({ mainShelf: res.data, currentBoxes: res.data.boxes, isLoading: false });
        } catch (err: any) {
            set({ error: "Главная полка не найдена", isLoading: false });
        }
    },

    // Реализуем пропущенный метод, чтобы интерфейс не ругался
    fetchShelfWithBoxes: async (shelfId: string) => {
        set({ isLoading: true });
        try {
            const res = await api.get<Shelf>("/shelf/get-shelf-with-boxes", {
                params: { shelf_id: shelfId }
            });
            set({ selectedShelf: res.data, currentBoxes: res.data.boxes, isLoading: false });
        } catch (err: any) {
            set({ error: "Не удалось загрузить содержимое полки", isLoading: false });
        }
    },

    // Публичная (read-only) выдача полки вместе с коробками и именем владельца.
    fetchPublicShelf: async (shelfId: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.get<Shelf>("/shelf/public-shelf-with-boxes", {
                params: { shelf_id: shelfId }
            });
            set({ publicShelf: res.data, currentBoxes: res.data.boxes, isLoading: false });
        } catch (err: any) {
            set({ error: "Публичная полка не найдена", isLoading: false });
        }
    },

    fetchTemplates: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.get<BoxTemplate[]>("/boxes/get-box-templates");
            set({ templates: res.data, isLoading: false });
        } catch (err: any) {
            set({ error: "Не удалось загрузить ленту", isLoading: false });
        }
    },

    // Инвентарь пользователя: все его инстансы коробок (как на полке, так и без).
    fetchInstances: async () => {
        try {
            const res = await api.get<Box[]>("/boxes/get-box-instances");
            set({ instances: res.data });
        } catch (err: any) {
            set({ error: "Не удалось загрузить инвентарь" });
        }
    },

    // Получить (создать) инстанс коробки из шаблона. Кладём в инвентарь
    // (shelf_id = null), откуда пользователь сам ставит её на полку.
    acquireBox: async (templateId: string) => {
        try {
            await api.post("/boxes/create-box-instance", {
                template_id: templateId,
                shelf_id: null,
            });
            await get().fetchInstances();
        } catch (err: any) {
            set({ error: "Не удалось получить коробку" });
        }
    },

    // Создать пользовательскую коробку (новый шаблон + экземпляр в инвентарь).
    // Бэкенд форсит редкость COMMON. Возвращаем созданный экземпляр.
    createBox: async (data: CreateBoxInput) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.post<Box>("/boxes/create-box", {
                title: data.title,
                description: data.description ?? null,
                price: data.price ?? 0,
                currency: (data.currency ?? "RUB").toLowerCase(),
                content: data.content ?? null,
                rarity: data.rarity ?? null,
            });
            await get().fetchInstances();
            set({ isLoading: false });
            return res.data;
        } catch (err: any) {
            set({ error: "Не удалось создать коробку", isLoading: false });
            return null;
        }
    },

    updateBox: async (instanceId: string, data: UpdateBoxInput) => {
        set({ isLoading: true, error: null });
        try {
            // Отправляем только реально переданные поля (PATCH-семантика).
            const body: Record<string, unknown> = {};
            if (data.title !== undefined) body.title = data.title;
            if (data.description !== undefined) body.description = data.description;
            if (data.price !== undefined) body.price = data.price;
            if (data.currency !== undefined) body.currency = data.currency.toLowerCase();
            if (data.rarity !== undefined) body.rarity = data.rarity;
            if (data.content !== undefined) body.content = data.content;

            const res = await api.patch<Box>("/boxes/update-box", body, {
                params: { instance_id: instanceId },
            });
            // Ресинхронизируем инвентарь и главную полку, чтобы правки названия/
            // редкости сразу отразились и на доске, и в карточках.
            await Promise.all([get().fetchInstances(), get().fetchMainShelf()]);
            set({ isLoading: false });
            return res.data;
        } catch (err: any) {
            set({ error: "Не удалось сохранить изменения", isLoading: false });
            return null;
        }
    },

    createShelf: async (title: string, isPublic: boolean) => {
        set({ isLoading: true, error: null });
        try {
            // is_main не передаём: бэкенд сам делает первую полку главной.
            const res = await api.post<Shelf>("/shelf/create-shelf", {
                title,
                is_public: isPublic,
            });
            // Ресинхронизируем состояние, чтобы новая (возможно главная) полка
            // сразу попала в shelves/mainShelf и пережила перезаход.
            await Promise.all([get().fetchShelves(), get().fetchMainShelf()]);
            set({ isLoading: false });
            return res.data;
        } catch (err: any) {
            set({ error: "Не удалось создать стеллаж", isLoading: false });
            return null;
        }
    },

    setMainShelf: async (shelfId: string) => {
        try {
            await api.post("/shelf/set-main-shelf", null, {
                params: { shelf_id: shelfId }
            });
            // Перечитываем список и главную полку, чтобы новый главный
            // (со звёздочкой) сразу переехал наверх и переотрисовался.
            await Promise.all([get().fetchShelves(), get().fetchMainShelf()]);
        } catch (err: any) {
            set({ error: "Не удалось назначить главный стеллаж" });
        }
    },

    moveBox: async (instanceId, shelfId) => {
        try {
            await api.post("/boxes/move-box-to-shelf", null, {
                params: { instance_id: instanceId, shelf_id: shelfId }
            });
            // Ресинхронизируем все затронутые срезы. Если коробку поставили на
            // не-главную полку — дополнительно перечитываем её содержимое, иначе
            // selectedShelf останется устаревшим и коробка не появится на доске.
            const { mainShelf } = get();
            const isNonMain = shelfId && shelfId !== mainShelf?.id;
            await Promise.all([
                get().fetchMainShelf(),
                get().fetchInstances(),
                ...(isNonMain && shelfId ? [get().fetchShelfWithBoxes(shelfId)] : []),
            ]);
        } catch (err) {
            console.error("Move error", err);
        }
    },

    // Сохраняем позицию коробки на сетке стеллажа. Оптимистично обновляем
    // активную полку (главную ИЛИ выбранную тематическую): если целевая ячейка
    // занята другой коробкой — меняем их координаты местами (бэкенд тоже
    // выполняет SWAP). При ошибке откатываемся.
    updateBoxPosition: async (instanceId, shelf_row, shelf_col, shelfId) => {
        const { mainShelf, selectedShelf } = get();
        const isMain = !shelfId || shelfId === mainShelf?.id;
        const prevShelf = isMain ? mainShelf : selectedShelf;
        if (!prevShelf) return;

        const moving = prevShelf.boxes.find((b) => b.id === instanceId);
        if (!moving) return;

        const fromRow = moving.shelf_row;
        const fromCol = moving.shelf_col;

        // Коробка, уже стоящая в целевой ячейке (если есть).
        const occupant = prevShelf.boxes.find(
            (b) => b.id !== instanceId && b.shelf_row === shelf_row && b.shelf_col === shelf_col
        );

        const nextBoxes = prevShelf.boxes.map((b) => {
            if (b.id === instanceId) {
                return { ...b, shelf_row, shelf_col };
            }
            if (occupant && b.id === occupant.id) {
                return { ...b, shelf_row: fromRow, shelf_col: fromCol };
            }
            return b;
        });

        set(isMain
            ? { mainShelf: { ...prevShelf, boxes: nextBoxes }, currentBoxes: nextBoxes }
            : { selectedShelf: { ...prevShelf, boxes: nextBoxes }, currentBoxes: nextBoxes }
        );

        try {
            await api.post("/boxes/update-box-position",
                { shelf_row, shelf_col },
                { params: { instance_id: instanceId } }
            );
        } catch (err) {
            set(isMain
                ? { mainShelf: prevShelf, currentBoxes: prevShelf.boxes, error: "Не удалось сохранить позицию коробки" }
                : { selectedShelf: prevShelf, currentBoxes: prevShelf.boxes, error: "Не удалось сохранить позицию коробки" }
            );
        }
    },

    deleteBox: async (instanceId: string) => {
        try {
            await api.delete("/boxes/delete-box-instance", {
                params: { instance_id: instanceId }
            });

            // Оптимистично убираем из текущей доски, затем ресинхронизируем
            // инвентарь и главную полку (коробка могла стоять на стеллаже).
            set((state) => ({
                currentBoxes: state.currentBoxes.filter(b => b.id !== instanceId)
            }));
            await Promise.all([get().fetchInstances(), get().fetchMainShelf()]);
        } catch (err) {
            set({ error: "Сессия истекла или недостаточно прав" });
        }
    } // Скобка была пропущена здесь
}));