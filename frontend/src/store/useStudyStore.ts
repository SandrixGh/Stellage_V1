import { create } from "zustand";
import { updateProfile } from "../api/profile";

export type CellStatus = "urgent" | "this-week" | "backlog" | "done" | null;

interface StudyState {
    // Серверное состояние
    studyModeEnabled: boolean;
    toggleStudyMode: () => Promise<void>;
    setStudyModeEnabled: (enabled: boolean) => void;
    syncFromServer: (enabled: boolean) => void;

    // Локальные настройки (localStorage)
    focusTimerMinutes: number;
    setFocusTimerMinutes: (minutes: number) => void;

    // Метки сетки стеллажа (localStorage)
    gridLabelsVisible: boolean;
    toggleGridLabels: () => void;
    rowLabels: string[];
    colLabels: string[];
    setRowLabels: (labels: string[]) => void;
    setColLabels: (labels: string[]) => void;

    // Статусы ячеек (localStorage, Record<"row:col", CellStatus>)
    cellStatuses: Record<string, CellStatus>;
    setCellStatus: (row: number, col: number, status: CellStatus) => void;
    clearCellStatus: (row: number, col: number) => void;
}

const STORAGE_KEYS = {
    ENABLED: "stellage-study-mode-enabled",
    TIMER: "stellage-study-focus-timer",
    GRID_LABELS_VISIBLE: "stellage-study-grid-labels-visible",
    ROW_LABELS: "stellage-study-row-labels",
    COL_LABELS: "stellage-study-col-labels",
    CELL_STATUSES: "stellage-study-cell-statuses",
};

const DEFAULT_ROW_LABELS = ["Горит сегодня", "На эту неделю", "Беклог / Проекты"];
const DEFAULT_COL_LABELS = ["Матанализ", "Физика", "Лингвистика", "Информатика"];

const safeGetJSON = <T,>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback;
    try {
        const item = localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : fallback;
    } catch {
        return fallback;
    }
};

export const useStudyStore = create<StudyState>((set, get) => ({
    studyModeEnabled: safeGetJSON<boolean>(STORAGE_KEYS.ENABLED, false),

    syncFromServer: (enabled: boolean) => {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(enabled));
        }
        set({ studyModeEnabled: enabled });
    },

    setStudyModeEnabled: (enabled: boolean) => {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(enabled));
        }
        set({ studyModeEnabled: enabled });
    },

    toggleStudyMode: async () => {
        const next = !get().studyModeEnabled;
        set({ studyModeEnabled: next });
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(next));
        }
        try {
            await updateProfile({ study_mode_enabled: next });
        } catch (err) {
            // Rollback on error
            set({ studyModeEnabled: !next });
            if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(!next));
            }
        }
    },

    focusTimerMinutes: safeGetJSON<number>(STORAGE_KEYS.TIMER, 25),
    setFocusTimerMinutes: (minutes: number) => {
        const valid = Math.max(1, Math.min(180, minutes));
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(valid));
        }
        set({ focusTimerMinutes: valid });
    },

    gridLabelsVisible: safeGetJSON<boolean>(STORAGE_KEYS.GRID_LABELS_VISIBLE, true),
    toggleGridLabels: () => {
        const next = !get().gridLabelsVisible;
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.GRID_LABELS_VISIBLE, JSON.stringify(next));
        }
        set({ gridLabelsVisible: next });
    },

    rowLabels: safeGetJSON<string[]>(STORAGE_KEYS.ROW_LABELS, DEFAULT_ROW_LABELS),
    setRowLabels: (labels: string[]) => {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.ROW_LABELS, JSON.stringify(labels));
        }
        set({ rowLabels: labels });
    },

    colLabels: safeGetJSON<string[]>(STORAGE_KEYS.COL_LABELS, DEFAULT_COL_LABELS),
    setColLabels: (labels: string[]) => {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.COL_LABELS, JSON.stringify(labels));
        }
        set({ colLabels: labels });
    },

    cellStatuses: safeGetJSON<Record<string, CellStatus>>(STORAGE_KEYS.CELL_STATUSES, {}),
    setCellStatus: (row: number, col: number, status: CellStatus) => {
        const key = `${row}:${col}`;
        const updated = { ...get().cellStatuses, [key]: status };
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.CELL_STATUSES, JSON.stringify(updated));
        }
        set({ cellStatuses: updated });
    },
    clearCellStatus: (row: number, col: number) => {
        const key = `${row}:${col}`;
        const updated = { ...get().cellStatuses };
        delete updated[key];
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.CELL_STATUSES, JSON.stringify(updated));
        }
        set({ cellStatuses: updated });
    },
}));
