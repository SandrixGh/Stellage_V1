import { create } from "zustand";
import type { UserVerifySchema } from "../types/Auth/auth";
import { api } from "../api/instance";

interface AuthState {
    user: UserVerifySchema | null;
    isAuthenticated: boolean;
    isInitialized: boolean;

    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isInitialized: false,

    checkAuth: async () => {
        try {
            const res = await api.get<UserVerifySchema>("/auth/get-user");
            set({user: res.data, isAuthenticated: true, isInitialized: true});
        } catch {
            set({ user: null, isAuthenticated: false, isInitialized: true });
        }
    },

    login: async (email, password) => {
        await api.post("/auth/login", {email, password});
        const res = await api.get<UserVerifySchema>("/auth/get-user");
        set({user: res.data, isAuthenticated: true})
    },

    logout: async () => {
        await api.get('/auth/logout');
        set({ user: null, isAuthenticated: false });
    },
}))

