import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
    // In dev, default to a same-origin relative path handled by the Vite proxy
    // (keeps the session cookie first-party). In prod, set VITE_API_URL.
    baseURL: import.meta.env.VITE_API_URL ?? '/api.v1',

    withCredentials: true,

    headers: {
        'Content-Type': 'application/json',
    },
});

// Колбэк, который выставляет useAuthStore при инициализации: когда сессию
// уже не спасти (refresh не удался), фронт должен показать разлогин.
// Через модульную переменную, чтобы instance.ts не импортировал стор и не
// создавал циклическую зависимость (стор импортирует api).
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: () => void) {
    onSessionExpired = cb;
}

// Тихо продлеваем сессию по refresh-cookie. Все параллельные 401 ждут один и
// тот же промис, чтобы не слать десяток /auth/refresh разом.
let refreshPromise: Promise<void> | null = null;
function refreshSession(): Promise<void> {
    if (!refreshPromise) {
        refreshPromise = api
            .post("/auth/refresh")
            .then(() => undefined)
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

// Эндпоинты, для которых 401 — это нормальный ответ (неверный логин, нет
// сессии), их нельзя гнать через refresh-retry.
const AUTH_BYPASS = ["/auth/refresh", "/auth/login", "/auth/logout"];

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as
            | (InternalAxiosRequestConfig & { _retry?: boolean })
            | undefined;
        const status = error.response?.status;
        const url = original?.url ?? "";

        const isBypassed = AUTH_BYPASS.some((p) => url.includes(p));

        if (status === 401 && original && !original._retry && !isBypassed) {
            original._retry = true;
            try {
                await refreshSession();
                return api(original);
            } catch {
                // Refresh не помог — сессия действительно мертва.
                onSessionExpired?.();
            }
        }

        return Promise.reject(error);
    }
);
