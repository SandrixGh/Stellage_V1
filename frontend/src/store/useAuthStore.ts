import { create } from "zustand";
import type { UserReturnData, UserVerifySchema} from "../types/Auth/auth";
import { api } from "../api/instance";

interface AuthState {
    user: UserVerifySchema | null;
    userLogin: UserReturnData | null;

    login: (email: string, password: string) => Promise<void>;

    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    userLogin: null,

    checkAuth: async () => {
        try {
            const res = await api.get<UserVerifySchema>("/auth/get-user");
            set({user: res.data});
        } catch {
            set({ user: null});
        }
    },

    login: async (email, password) => {
        try {
            const res = await api.post<UserReturnData>("/auth/login", {email, password});
            set({userLogin: res.data});
        } catch {
            set({userLogin: null});
        }
        
    },

    logout: async () => {
        await api.get('/auth/logout');
        set({ user: null});
    },
}))

