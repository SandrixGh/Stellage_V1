import { useEffect } from "react";

/**
 * Пока открыто модальное окно, блокирует прокрутку страницы под ним: колесо и
 * тач-скролл работают только внутри самой модалки, а фон не «протекает».
 * Восстанавливает прежний overflow при закрытии. Поддерживает вложенные
 * модалки через счётчик — фон разблокируется только когда закрылась последняя.
 */
let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

export function useBodyScrollLock(active = true): void {
    useEffect(() => {
        if (!active) return;
        const body = document.body;
        if (lockCount === 0) {
            savedOverflow = body.style.overflow;
            savedPaddingRight = body.style.paddingRight;
            // Скроллбары скрыты глобально, компенсировать их ширину не нужно —
            // просто запрещаем прокрутку фона.
            body.style.overflow = "hidden";
        }
        lockCount += 1;
        return () => {
            lockCount -= 1;
            if (lockCount === 0) {
                body.style.overflow = savedOverflow;
                body.style.paddingRight = savedPaddingRight;
            }
        };
    }, [active]);
}
