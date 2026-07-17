import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import "./AvatarCropper.css";

interface AvatarCropperProps {
    /** Выбранный пользователем файл изображения. */
    file: File;
    onCancel: () => void;
    /** Возвращает обрезанный квадратный файл (WebP или JPEG) для загрузки. */
    onCrop: (cropped: File) => void;
}

const BOX = 320; // размер области предпросмотра (px)
const OUTPUT = 1024; // сторона итогового квадрата (px) — крупнее = чётче на ретине
// Качество для форматов с потерями (WebP/JPEG). PNG игнорирует этот аргумент.
const OUTPUT_QUALITY = 0.92;

/**
 * Многошаговый даунскейл источника: за один drawImage сильное уменьшение даёт
 * «мыло», поэтому ужимаем не более чем вдвое за шаг. Возвращает canvas, близкий
 * по размеру к целевому прямоугольнику (targetW×targetH), который затем одним
 * мягким шагом ложится в итоговый кадр.
 */
const stepDown = (
    source: CanvasImageSource,
    srcW: number,
    srcH: number,
    targetW: number,
    targetH: number,
): CanvasImageSource => {
    let curW = srcW;
    let curH = srcH;
    let current: CanvasImageSource = source;
    // Пока можем безопасно уменьшить вдвое и всё ещё быть больше цели.
    while (curW > targetW * 2 && curH > targetH * 2) {
        const nextW = Math.max(targetW, Math.round(curW / 2));
        const nextH = Math.max(targetH, Math.round(curH / 2));
        const step = document.createElement("canvas");
        step.width = nextW;
        step.height = nextH;
        const sctx = step.getContext("2d");
        if (!sctx) break;
        sctx.imageSmoothingEnabled = true;
        sctx.imageSmoothingQuality = "high";
        sctx.drawImage(current, 0, 0, nextW, nextH);
        current = step;
        curW = nextW;
        curH = nextH;
    }
    return current;
};

/** Выбирает WebP, если браузер реально умеет его кодировать, иначе JPEG. */
const pickOutputMime = (): { mime: string; ext: string } => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const webp = canvas.toDataURL("image/webp");
    if (webp.startsWith("data:image/webp")) return { mime: "image/webp", ext: "webp" };
    return { mime: "image/jpeg", ext: "jpg" };
};

/**
 * Кадрирование аватара перед загрузкой: квадратная рамка, зум (колесо/слайдер) и
 * сдвиг перетаскиванием. Обрезка делается на canvas — на сервер уходит уже
 * готовый квадрат 1024×1024 в WebP (или JPEG-фолбэк) с реальным quality и
 * многошаговым даунскейлом, поэтому аватар не мылится. Без внешних библиотек.
 */
export const AvatarCropper = ({ file, onCancel, onCrop }: AvatarCropperProps) => {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [busy, setBusy] = useState(false);
    useBodyScrollLock();
    const drag = useRef<{ x: number; y: number } | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    // Загружаем выбранный файл в <img> и вычисляем масштаб «cover».
    useEffect(() => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            const cover = Math.max(BOX / image.width, BOX / image.height);
            setImg(image);
            setMinScale(cover);
            setScale(cover);
            setOffset({ x: 0, y: 0 });
        };
        image.src = url;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Держим изображение так, чтобы квадрат всегда был полностью покрыт.
    const clampOffset = useCallback(
        (x: number, y: number, s: number) => {
            if (!img) return { x, y };
            const w = img.width * s;
            const h = img.height * s;
            const maxX = Math.max(0, (w - BOX) / 2);
            const maxY = Math.max(0, (h - BOX) / 2);
            return {
                x: Math.max(-maxX, Math.min(maxX, x)),
                y: Math.max(-maxY, Math.min(maxY, y)),
            };
        },
        [img],
    );

    const onPointerDown = (e: React.PointerEvent) => {
        drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!drag.current) return;
        const next = clampOffset(e.clientX - drag.current.x, e.clientY - drag.current.y, scale);
        setOffset(next);
    };
    const onPointerUp = () => {
        drag.current = null;
    };

    const changeScale = useCallback(
        (s: number) => {
            const clamped = Math.max(minScale, Math.min(minScale * 4, s));
            setScale(clamped);
            setOffset((o) => clampOffset(o.x, o.y, clamped));
        },
        [minScale, clampOffset],
    );

    // Колесо мыши зумит картинку. React onWheel — passive, в нём preventDefault
    // не работает и прокручивается вся страница. Поэтому вешаем нативный
    // слушатель с { passive: false } и гасим прокрутку страницы. Множим текущий
    // масштаб через функциональный апдейт, чтобы не зависеть от устаревшего
    // значения scale в замыкании.
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.08 : 0.926;
            setScale((prev) => {
                const clamped = Math.max(minScale, Math.min(minScale * 4, prev * factor));
                setOffset((o) => clampOffset(o.x, o.y, clamped));
                return clamped;
            });
        };
        stage.addEventListener("wheel", onWheel, { passive: false });
        return () => stage.removeEventListener("wheel", onWheel);
    }, [minScale, clampOffset]);

    const handleCrop = () => {
        if (!img || busy) return;
        setBusy(true);
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT;
        canvas.height = OUTPUT;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setBusy(false);
            return;
        }
        // Переводим экранные координаты предпросмотра в координаты вывода.
        const ratio = OUTPUT / BOX;
        const w = img.width * scale * ratio;
        const h = img.height * scale * ratio;
        const cx = OUTPUT / 2 + offset.x * ratio;
        const cy = OUTPUT / 2 + offset.y * ratio;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        // Крупный оригинал сперва мягко ужимаем до размера отрисовки (step-down),
        // иначе одиночный drawImage с сильным уменьшением даёт «мыло».
        const scaledSource = stepDown(img, img.width, img.height, Math.round(w), Math.round(h));
        ctx.drawImage(scaledSource, cx - w / 2, cy - h / 2, w, h);

        const { mime, ext } = pickOutputMime();
        canvas.toBlob(
            (blob) => {
                setBusy(false);
                if (!blob) return;
                onCrop(new File([blob], `avatar.${ext}`, { type: mime }));
            },
            mime,
            OUTPUT_QUALITY,
        );
    };

    const imgStyle = img
        ? {
              width: img.width * scale,
              height: img.height * scale,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          }
        : undefined;

    return createPortal(
        <div className="cropper-overlay" onClick={onCancel}>
            <div className="cropper" onClick={(e) => e.stopPropagation()}>
                <h2 className="cropper-title">Кадрирование аватара</h2>
                <p className="cropper-hint">Перетащите и масштабируйте — область в рамке станет аватаром.</p>

                <div
                    ref={stageRef}
                    className="cropper-stage"
                    style={{ width: BOX, height: BOX }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                >
                    {img && <img className="cropper-img" src={img.src} style={imgStyle} alt="" draggable={false} />}
                    <div className="cropper-frame" aria-hidden="true" />
                </div>

                <input
                    className="cropper-zoom"
                    type="range"
                    min={minScale}
                    max={minScale * 4}
                    step={0.001}
                    value={scale}
                    onChange={(e) => changeScale(Number(e.target.value))}
                    aria-label="Масштаб"
                />

                <div className="cropper-actions">
                    <button type="button" className="cropper-btn ghost" onClick={onCancel} disabled={busy}>
                        Отмена
                    </button>
                    <button type="button" className="cropper-btn primary" onClick={handleCrop} disabled={busy || !img}>
                        {busy ? "Обработка…" : "Сохранить"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
