import { create } from "zustand";
import type { UserVerifySchema } from "../types/Auth/auth";
import { api } from "../api/instance";

interface AuthState {
    user: UserVerifySchema | null;
    isAuthenticated: boolean;
    isInitialized: boolean;

    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    delete_account: () => Promise<void>;
    getUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isInitialized: false,

    getUser: async () => {
        try {
            const res = await api.get<UserVerifySchema>("/auth/get-user");
            set({user: res.data, isAuthenticated: true, isInitialized: true});
        } catch {
            set({ user: null, isAuthenticated: false, isInitialized: true });
        }
    },

    login: async (email, password) => {
        await api.post("/auth/login", {email, password});
        await get().getUser();
    },

    logout: async () => {
        try {
            await api.get('/auth/logout');
        } finally {
            set({ user: null, isAuthenticated: false });
        }
    },

    delete_account: async () => {
        const user = get();

        if(user) {
            await api.get("/auth/delete-account");
            set({ user: null, isAuthenticated: false });
        }
    },
}))

