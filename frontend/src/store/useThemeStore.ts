import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "stellage-theme";

const readInitialTheme = (): Theme => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
};

const applyTheme = (theme: Theme) => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
};

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const initialTheme = readInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: initialTheme,

    setTheme: (theme) => {
        window.localStorage.setItem(STORAGE_KEY, theme);
        applyTheme(theme);
        set({ theme });
    },

    toggleTheme: () => {
        const next: Theme = get().theme === "light" ? "dark" : "light";
        get().setTheme(next);
    },
}));
