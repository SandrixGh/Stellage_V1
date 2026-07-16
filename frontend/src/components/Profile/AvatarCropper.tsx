import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./AvatarCropper.css";

interface AvatarCropperProps {
    /** Выбранный пользователем файл изображения. */
    file: File;
    onCancel: () => void;
    /** Возвращает обрезанный квадратный PNG-файл для загрузки. */
    onCrop: (cropped: File) => void;
}

const BOX = 320; // размер области предпросмотра (px)
const OUTPUT = 512; // сторона итогового квадрата (px)

/**
 * Кадрирование аватара перед загрузкой: квадратная рамка, зум (колесо/слайдер) и
 * сдвиг перетаскиванием. Обрезка делается на canvas — на сервер уходит уже
 * готовый квадрат, поэтому серых полей в профиле не бывает. Без внешних
 * библиотек.
 */
export const AvatarCropper = ({ file, onCancel, onCrop }: AvatarCropperProps) => {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [busy, setBusy] = useState(false);
    const drag = useRef<{ x: number; y: number } | null>(null);

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

    const changeScale = (s: number) => {
        const clamped = Math.max(minScale, Math.min(minScale * 4, s));
        setScale(clamped);
        setOffset((o) => clampOffset(o.x, o.y, clamped));
    };

    const onWheel = (e: React.WheelEvent) => {
        changeScale(scale * (e.deltaY < 0 ? 1.08 : 0.926));
    };

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
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);

        canvas.toBlob(
            (blob) => {
                setBusy(false);
                if (!blob) return;
                onCrop(new File([blob], "avatar.png", { type: "image/png" }));
            },
            "image/png",
            0.92,
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
                    className="cropper-stage"
                    style={{ width: BOX, height: BOX }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onWheel={onWheel}
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
