import { create } from "zustand";

// Лёгкий реестр аккаунтов, которыми пользовались в этом браузере, для меню
// быстрого переключения. Храним ТОЛЬКО отображаемые данные — никаких паролей
// и токенов. Само переключение = предзаполненный логин (пароль вводится),
// поэтому список безопасно лежит в localStorage.
export interface KnownAccount {
    email: string;
    username?: string | null;
    nickname?: string | null;
    avatarUrl?: string | null;
}

const STORAGE_KEY = "stellage-accounts";
const MAX_ACCOUNTS = 6;

const read = (): KnownAccount[] => {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const write = (accounts: KnownAccount[]) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch {
        // localStorage недоступен (приватный режим и т.п.) — просто пропускаем.
    }
};

interface AccountsState {
    accounts: KnownAccount[];
    // Добавить/обновить аккаунт (двигает его в начало списка).
    remember: (account: KnownAccount) => void;
    // Убрать аккаунт из меню (не выходит из него, просто прячет из списка).
    forget: (email: string) => void;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
    accounts: read(),

    remember: (account) => {
        const email = account.email.toLowerCase();
        const rest = get().accounts.filter(
            (a) => a.email.toLowerCase() !== email,
        );
        const next = [{ ...account, email }, ...rest].slice(0, MAX_ACCOUNTS);
        write(next);
        set({ accounts: next });
    },

    forget: (email) => {
        const target = email.toLowerCase();
        const next = get().accounts.filter(
            (a) => a.email.toLowerCase() !== target,
        );
        write(next);
        set({ accounts: next });
    },
}));
