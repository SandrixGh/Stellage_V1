import { create } from "zustand";
import { api } from "../api/instance";
import type { Shelf } from "../types/Stellage/shelves";
import type { Box } from "../types/Stellage/boxes";

interface StellageState {
    shelves: Shelf[];
    mainShelf: Shelf | null;
    currentBoxes: Box[];
    isLoading: boolean;
    error: string | null;

    fetchShelves: () => Promise<void>;
    fetchMainShelf: () => Promise<void>;
    fetchShelfWithBoxes: (shelfId: string) => Promise<void>;
    
    moveBox: (instanceId: string, shelfId: string | null) => Promise<void>;
    deleteBox: (instanceId: string) => Promise<void>;
}

export const useStellageStore = create<StellageState>((set, get) => ({
    shelves: [],
    mainShelf: null,
    currentBoxes: [],
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