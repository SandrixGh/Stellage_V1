import { create } from "zustand";
import axios from "axios";
import type { UserVerifySchema } from "../types/Auth/auth";
import { api, setOnSessionExpired } from "../api/instance";
import { switchAccount } from "../api/sessions";
import { useStellageStore } from "./useStellageStore";

interface AuthState {
    user: UserVerifySchema | null;
    isAuthenticated: boolean;
    isInitialized: boolean;

    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    delete_account: () => Promise<void>;
    getUser: () => Promise<void>;
    clearSession: () => void;
    // Мгновенное переключение на другой аккаунт устройства без пароля.
    switchTo: (userId: string) => Promise<void>;
    updateProfile: (data: { username?: string; nickname?: string; bio?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isInitialized: false,

    getUser: async () => {
        try {
            const res = await api.get<UserVerifySchema>("/auth/get-user");
            set({user: res.data, isAuthenticated: true, isInitialized: true});
        } catch (error) {
            // Only treat a real 401 (no/invalid session) as logged out.
            // Transient/network errors must not flip an authenticated user out.
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                set({ user: null, isAuthenticated: false, isInitialized: true });
            } else {
                set({ isInitialized: true });
            }
        }
    },

    login: async (email, password) => {
        // Чистим стеллаж-стор до запроса, чтобы коробки/полки прошлого
        // аккаунта не отрисовались под новым пользователем.
        useStellageStore.getState().reset();
        await api.post("/auth/login", {email, password});
        await get().getUser();
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            set({ user: null, isAuthenticated: false });
            useStellageStore.getState().reset();
        }
    },

    // Локальный сброс без запроса на бэк: вызывается, когда сессия уже мертва
    // (refresh не удался) — сервер трогать бессмысленно.
    clearSession: () => {
        set({ user: null, isAuthenticated: false });
        useStellageStore.getState().reset();
    },

    // Переключение на другой аккаунт устройства без пароля: сервер перевыпускает
    // cookie активного аккаунта, затем перечитываем пользователя.
    switchTo: async (userId) => {
        useStellageStore.getState().reset();
        await switchAccount(userId);
        await get().getUser();
    },

    updateProfile: async (data) => {
        await api.patch("/profile/update", data);
        await get().getUser();
    },

    delete_account: async () => {
        const { user } = get();

        if(user) {
            await api.delete("/auth/delete-account");
            set({ user: null, isAuthenticated: false });
            useStellageStore.getState().reset();
        }
    },
}))

// Когда axios-interceptor исчерпал попытку refresh — разлогиниваем UI.
setOnSessionExpired(() => {
    useAuthStore.getState().clearSession();
});

