import { create } from "zustand";
import { api } from "../api/instance";
import type { Shelf } from "../types/Stellage/shelves";
import type { Box, BoxContent, BoxTemplate } from "../types/Stellage/boxes";

/** Убирает коробку из снимка полки (или отдаёт полку как есть, если её нет).
 *  Нужно, чтобы delete/gift оптимистично чистили не только currentBoxes, но и
 *  сохранённые mainShelf/selectedShelf/publicShelf — иначе коробка «возвращается»
 *  при повторном заходе на полку до рефетча. */
function removeBoxFromShelf(shelf: Shelf | null, boxId: string): Shelf | null {
    if (!shelf || !shelf.boxes) return shelf;
    return { ...shelf, boxes: shelf.boxes.filter((b) => b.id !== boxId) };
}

/** Данные формы создания пользовательской коробки.
 *  rarity применяется только для суперюзеров (обычным форсится Common на бэке). */
export interface CreateBoxInput {
    title: string;
    description?: string;
    price?: number;
    currency?: string;
    content?: BoxContent;
    rarity?: string;
    is_public?: "public" | "private";
}

/** Частичное редактирование коробки владельцем. Любое поле опционально —
 *  меняется только переданное (поля шаблона правит лишь создатель коробки). */
export interface UpdateBoxInput {
    title?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    rarity?: string;
    content?: BoxContent | null;
    is_public?: "public" | "private";
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
    /** Распечатать коробку (SEALED → NOT_SEALED, необратимо). */
    unsealBox: (instanceId: string) => Promise<Box | null>;
    /** Перечитать одну коробку (после загрузки/удаления ассетов). */
    refreshBox: (instanceId: string) => Promise<Box | null>;

    moveBox: (instanceId: string, shelfId: string | null) => Promise<void>;
    updateBoxPosition: (instanceId: string, shelf_row: number, shelf_col: number, shelfId?: string) => Promise<void>;
    deleteBox: (instanceId: string) => Promise<void>;

    /** Подарить коробку пользователю по username; убирает её из своего состояния. */
    giftBox: (instanceId: string, toUsername: string) => Promise<boolean>;

    /** Мгновенное реактивное обновление количества лайков коробки на стеллаже. */
    updateBoxLikes: (boxId: string, likesCount: number, isLiked?: boolean) => void;
    /** Мгновенное реактивное обновление количества лайков шаблона в ленте и связанных коробок. */
    updateTemplateLikes: (templateId: string, likesCount: number, isLiked?: boolean) => void;

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
            set({ shelves: Array.isArray(res.data) ? res.data : [], isLoading: false });
        } catch (err: any) {
            set({ shelves: [], error: "Ошибка загрузки полок", isLoading: false });
        }
    },

    fetchMainShelf: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get<Shelf>("/shelf/main-shelf-with-boxes");
            const boxes = Array.isArray(res.data?.boxes) ? res.data.boxes : [];
            set({ mainShelf: res.data ? { ...res.data, boxes } : null, currentBoxes: boxes, isLoading: false });
        } catch (err: any) {
            set({ mainShelf: null, currentBoxes: [], error: "Главная полка не найдена", isLoading: false });
        }
    },

    // Реализуем пропущенный метод, чтобы интерфейс не ругался
    fetchShelfWithBoxes: async (shelfId: string) => {
        set({ isLoading: true });
        try {
            const res = await api.get<Shelf>("/shelf/get-shelf-with-boxes", {
                params: { shelf_id: shelfId }
            });
            const boxes = Array.isArray(res.data?.boxes) ? res.data.boxes : [];
            set({ selectedShelf: res.data ? { ...res.data, boxes } : null, currentBoxes: boxes, isLoading: false });
        } catch (err: any) {
            set({ selectedShelf: null, currentBoxes: [], error: "Не удалось загрузить содержимое полки", isLoading: false });
        }
    },

    // Публичная (read-only) выдача полки вместе с коробками и именем владельца.
    fetchPublicShelf: async (shelfId: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.get<Shelf>("/shelf/public-shelf-with-boxes", {
                params: { shelf_id: shelfId }
            });
            const boxes = Array.isArray(res.data?.boxes) ? res.data.boxes : [];
            set({ publicShelf: res.data ? { ...res.data, boxes } : null, currentBoxes: boxes, isLoading: false });
        } catch (err: any) {
            set({ publicShelf: null, currentBoxes: [], error: "Публичная полка не найдена", isLoading: false });
        }
    },

    fetchTemplates: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.get<BoxTemplate[]>("/boxes/get-box-templates");
            set({ templates: Array.isArray(res.data) ? res.data : [], isLoading: false });
        } catch (err: any) {
            set({ templates: [], error: "Не удалось загрузить ленту", isLoading: false });
        }
    },

    // Инвентарь пользователя: все его инстансы коробок (как на полке, так и без).
    fetchInstances: async () => {
        try {
            const res = await api.get<Box[]>("/boxes/get-box-instances");
            set({ instances: Array.isArray(res.data) ? res.data : [] });
        } catch (err: any) {
            set({ instances: [], error: "Не удалось загрузить инвентарь" });
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
                currency: (data.currency ?? "stella").toLowerCase(),
                content: data.content ?? null,
                rarity: data.rarity ?? null,
                is_public: data.is_public ?? "public",
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
            if (data.currency !== undefined) {
                const raw = data.currency.toLowerCase();
                body.currency = raw === "stellacoin" || raw === "stella" ? "stella" : raw;
            }
            if (data.rarity !== undefined) body.rarity = data.rarity;
            if (data.content !== undefined) body.content = data.content;
            if (data.is_public !== undefined) body.is_public = data.is_public;

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

    unsealBox: async (instanceId: string) => {
        try {
            const res = await api.post<Box>("/boxes/unseal-box", null, {
                params: { instance_id: instanceId },
            });
            const fresh = res.data;
            // Оптимистично подменяем снимок в уже загруженных списках…
            set((state) => ({
                instances: state.instances.map((b) => (b.id === fresh.id ? fresh : b)),
                currentBoxes: state.currentBoxes.map((b) => (b.id === fresh.id ? fresh : b)),
            }));
            // …и ресинхронизируем инвентарь и главную полку с сервера, иначе
            // главная полка приходит из кэша полки и статус «залипает» до
            // следующего рефетча (баг: распечатка «срабатывала не с первого раза»).
            await Promise.all([get().fetchInstances(), get().fetchMainShelf()]);
            return fresh;
        } catch (err) {
            set({ error: "Не удалось распечатать коробку" });
            return null;
        }
    },

    // Точечная ресинхронизация одной коробки: после загрузки/удаления ассетов
    // обновляем её снимок в инвентаре и на текущей доске без полного refetch.
    refreshBox: async (instanceId: string) => {
        try {
            const res = await api.get<Box>("/boxes/get-box-instance", {
                params: { instance_id: instanceId },
            });
            const fresh = res.data;
            set((state) => ({
                instances: state.instances.map((b) => (b.id === fresh.id ? fresh : b)),
                currentBoxes: state.currentBoxes.map((b) => (b.id === fresh.id ? fresh : b)),
            }));
            return fresh;
        } catch (err) {
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

            // Оптимистично убираем из текущей доски И из снимков всех полок
            // (иначе удалённая коробка «вернётся» при повторном заходе на
            // selectedShelf/publicShelf до рефетча), затем ресинхронизируем.
            set((state) => ({
                currentBoxes: state.currentBoxes.filter(b => b.id !== instanceId),
                mainShelf: removeBoxFromShelf(state.mainShelf, instanceId),
                selectedShelf: removeBoxFromShelf(state.selectedShelf, instanceId),
                publicShelf: removeBoxFromShelf(state.publicShelf, instanceId),
            }));
            await Promise.all([get().fetchInstances(), get().fetchMainShelf()]);
        } catch (err) {
            set({ error: "Сессия истекла или недостаточно прав" });
        }
    },

    giftBox: async (instanceId: string, toUsername: string) => {
        try {
            await api.post(
                "/boxes/gift-box",
                { to_username: toUsername },
                { params: { instance_id: instanceId } },
            );
            // Коробка ушла другому владельцу — убираем её из своих списков
            // и из снимков всех полок, затем ресинхронизируем.
            set((state) => ({
                currentBoxes: state.currentBoxes.filter((b) => b.id !== instanceId),
                instances: state.instances.filter((b) => b.id !== instanceId),
                mainShelf: removeBoxFromShelf(state.mainShelf, instanceId),
                selectedShelf: removeBoxFromShelf(state.selectedShelf, instanceId),
                publicShelf: removeBoxFromShelf(state.publicShelf, instanceId),
            }));
            await Promise.all([get().fetchInstances(), get().fetchMainShelf()]);
            return true;
        } catch (err) {
            set({ error: "Не удалось подарить коробку" });
            return false;
        }
    },

    updateBoxLikes: (boxId: string, likesCount: number, isLiked?: boolean) => {
        set((state) => {
            const matchesBox = (b: Box) => {
                const bTplId = b.template_id || b.template?.id;
                return b.id === boxId || bTplId === boxId;
            };

            const patchBox = (b: Box) => {
                if (matchesBox(b)) {
                    return {
                        ...b,
                        likes_count: likesCount,
                        is_liked: isLiked !== undefined ? isLiked : b.is_liked,
                        template: b.template ? {
                            ...b.template,
                            likes_count: likesCount,
                            is_liked: isLiked !== undefined ? isLiked : b.template.is_liked,
                        } : b.template,
                    };
                }
                return b;
            };

            const patchShelf = (s: Shelf | null) => s ? { ...s, boxes: s.boxes.map(patchBox) } : null;

            return {
                instances: state.instances.map(patchBox),
                currentBoxes: state.currentBoxes.map(patchBox),
                mainShelf: patchShelf(state.mainShelf),
                selectedShelf: patchShelf(state.selectedShelf),
                publicShelf: patchShelf(state.publicShelf),
                shelves: state.shelves.map((s) => ({ ...s, boxes: s.boxes.map(patchBox) })),
                templates: state.templates.map((t) =>
                    t.id === boxId
                        ? {
                              ...t,
                              likes_count: likesCount,
                              is_liked: isLiked !== undefined ? isLiked : t.is_liked,
                          }
                        : t
                ),
            };
        });
    },

    updateTemplateLikes: (templateId: string, likesCount: number, isLiked?: boolean) => {
        set((state) => {
            const patchBox = (b: Box) => {
                const bTplId = b.template_id || b.template?.id;
                if (bTplId === templateId || b.id === templateId) {
                    return {
                        ...b,
                        likes_count: likesCount,
                        is_liked: isLiked !== undefined ? isLiked : b.is_liked,
                        template: b.template ? {
                            ...b.template,
                            likes_count: likesCount,
                            is_liked: isLiked !== undefined ? isLiked : b.template.is_liked,
                        } : b.template,
                    };
                }
                return b;
            };

            const patchShelf = (s: Shelf | null) => s ? { ...s, boxes: s.boxes.map(patchBox) } : null;

            return {
                templates: state.templates.map((t) =>
                    t.id === templateId
                        ? {
                              ...t,
                              likes_count: likesCount,
                              is_liked: isLiked !== undefined ? isLiked : t.is_liked,
                          }
                        : t
                ),
                instances: state.instances.map(patchBox),
                currentBoxes: state.currentBoxes.map(patchBox),
                mainShelf: patchShelf(state.mainShelf),
                selectedShelf: patchShelf(state.selectedShelf),
                publicShelf: patchShelf(state.publicShelf),
                shelves: state.shelves.map((s) => ({ ...s, boxes: s.boxes.map(patchBox) })),
            };
        });
    },
}));