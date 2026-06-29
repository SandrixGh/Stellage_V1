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
    updateProfile: (data: { username?: string; nickname?: string }) => Promise<void>;
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
            await api.post('/auth/logout');
        } finally {
            set({ user: null, isAuthenticated: false });
        }
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
        }
    },
}))

