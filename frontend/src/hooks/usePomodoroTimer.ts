import { useEffect, useState, useCallback, useRef } from "react";
import { useStudyStore } from "../store/useStudyStore";

export interface PomodoroTimer {
    timeLeft: number; // секунды
    isRunning: boolean;
    progress: number; // 0..1
    totalDuration: number; // секунды
    start: () => void;
    pause: () => void;
    reset: () => void;
    setDurationMinutes: (minutes: number) => void;
}

interface SavedSession {
    timeLeft: number;
    totalDuration: number;
    isRunning: boolean;
    lastUpdated: number;
}

export function usePomodoroTimer(boxId: string = "default"): PomodoroTimer {
    const defaultMinutes = useStudyStore((s) => s.focusTimerMinutes);
    const storageKey = `stellage-study-pomodoro-${boxId}`;

    const [totalDuration, setTotalDuration] = useState<number>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed: SavedSession = JSON.parse(saved);
                return parsed.totalDuration || defaultMinutes * 60;
            }
        } catch {
            // fallback
        }
        return defaultMinutes * 60;
    });

    const [timeLeft, setTimeLeft] = useState<number>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed: SavedSession = JSON.parse(saved);
                if (parsed.isRunning && parsed.lastUpdated) {
                    const elapsed = Math.floor((Date.now() - parsed.lastUpdated) / 1000);
                    return Math.max(0, parsed.timeLeft - elapsed);
                }
                return parsed.timeLeft;
            }
        } catch {
            // fallback
        }
        return defaultMinutes * 60;
    });

    const [isRunning, setIsRunning] = useState<boolean>(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Save session state to localStorage
    useEffect(() => {
        try {
            const data: SavedSession = {
                timeLeft,
                totalDuration,
                isRunning,
                lastUpdated: Date.now(),
            };
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
            // ignore
        }
    }, [timeLeft, totalDuration, isRunning, storageKey]);

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning]);

    const start = useCallback(() => setIsRunning(true), []);
    const pause = useCallback(() => setIsRunning(false), []);
    const reset = useCallback(() => {
        setIsRunning(false);
        setTimeLeft(totalDuration);
    }, [totalDuration]);

    const setDurationMinutes = useCallback((minutes: number) => {
        const secs = Math.max(60, minutes * 60);
        setTotalDuration(secs);
        setTimeLeft(secs);
        setIsRunning(false);
    }, []);

    const progress = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;

    return {
        timeLeft,
        isRunning,
        progress,
        totalDuration,
        start,
        pause,
        reset,
        setDurationMinutes,
    };
}
