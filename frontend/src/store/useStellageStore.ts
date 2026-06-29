import { create } from "zustand";
import { api } from "../api/instance";
import type { Shelf } from "../types/Stellage/shelves";
import type { Box, BoxTemplate } from "../types/Stellage/boxes";

interface StellageState {
    shelves: Shelf[];
    mainShelf: Shelf | null;
    publicShelf: Shelf | null;
    currentBoxes: Box[];
    templates: BoxTemplate[];
    isLoading: boolean;
    error: string | null;

    fetchShelves: () => Promise<void>;
    fetchMainShelf: () => Promise<void>;
    fetchShelfWithBoxes: (shelfId: string) => Promise<void>;
    fetchPublicShelf: (shelfId: string) => Promise<void>;
    fetchTemplates: () => Promise<void>;

    moveBox: (instanceId: string, shelfId: string | null) => Promise<void>;
    updateBoxPosition: (instanceId: string, shelf_row: number, shelf_col: number) => Promise<void>;
    deleteBox: (instanceId: string) => Promise<void>;
}

export const useStellageStore = create<StellageState>((set, get) => ({
    shelves: [],
    mainShelf: null,
    publicShelf: null,
    currentBoxes: [],
    templates: [],
    isLoading: false,
    error: null,

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
            set({ currentBoxes: res.data.boxes, isLoading: false });
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

    moveBox: async (instanceId, shelfId) => {
        try {
            await api.post("/boxes/move-box-to-shelf", null, {
                params: { instance_id: instanceId, shelf_id: shelfId }
            });
            get().fetchMainShelf(); 
        } catch (err) {
            console.error("Move error", err);
        }
    },

    // Сохраняем позицию коробки на сетке стеллажа. Оптимистично обновляем
    // mainShelf.boxes: если целевая ячейка занята другой коробкой — меняем их
    // координаты местами (бэкенд тоже выполняет SWAP). При ошибке откатываемся.
    updateBoxPosition: async (instanceId, shelf_row, shelf_col) => {
        const prevShelf = get().mainShelf;
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

        set({
            mainShelf: { ...prevShelf, boxes: nextBoxes },
            currentBoxes: nextBoxes,
        });

        try {
            await api.post("/boxes/update-box-position",
                { shelf_row, shelf_col },
                { params: { instance_id: instanceId } }
            );
        } catch (err) {
            set({
                mainShelf: prevShelf,
                currentBoxes: prevShelf.boxes,
                error: "Не удалось сохранить позицию коробки",
            });
        }
    },

    deleteBox: async (instanceId: string) => {
        try {
            await api.delete("/boxes/delete-box-instance", {
                params: { instance_id: instanceId }
            });
            
            set((state) => ({
                currentBoxes: state.currentBoxes.filter(b => b.id !== instanceId)
            }));
        } catch (err) {
            set({ error: "Сессия истекла или недостаточно прав" });
        }
    } // Скобка была пропущена здесь
}));