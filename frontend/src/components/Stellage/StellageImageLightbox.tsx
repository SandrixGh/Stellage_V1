import { useState, useEffect, useRef } from "react";
import { getAssetUrl, formatBytes } from "../../api/assets";
import "./StellageImageLightbox.css";

interface StellageImageLightboxProps {
    assetId: string;
    alt?: string;
    originalName?: string;
    mime?: string;
    sizeBytes?: number;
    createdAt?: string;
    onClose: () => void;
}

export const StellageImageLightbox = ({
    assetId,
    alt = "Изображение коробки",
    originalName = "Изображение",
    mime,
    sizeBytes,
    createdAt,
    onClose,
}: StellageImageLightboxProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [showMeta, setShowMeta] = useState(false);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const viewportRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        (async () => {
            try {
                const target = await getAssetUrl(assetId);
                if (!cancelled) {
                    setImageUrl(target.url);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setFailed(true);
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [assetId]);

    // Mouse wheel zoom with e.preventDefault() to prevent page scroll
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const onWheelNative = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -0.15 : 0.15;
            setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 4));
        };
        el.addEventListener("wheel", onWheelNative, { passive: false });
        return () => el.removeEventListener("wheel", onWheelNative);
    }, []);

    useEffect(() => {
        if (zoom <= 1) setPan({ x: 0, y: 0 });
    }, [zoom]);

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
    };
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || zoom <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialPanX: pan.x,
            initialPanY: pan.y,
        };
    };

    // Global window listeners for drag panning to prevent losing mouse focus
    useEffect(() => {
        if (!isDragging) return;
        const handleWindowMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            setPan({
                x: dragStartRef.current.initialPanX + dx,
                y: dragStartRef.current.initialPanY + dy,
            });
        };
        const handleWindowMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleWindowMouseMove);
        window.addEventListener("mouseup", handleWindowMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleWindowMouseMove);
            window.removeEventListener("mouseup", handleWindowMouseUp);
        };
    }, [isDragging]);

    const formatDate = (iso?: string) => {
        if (!iso) return "—";
        try {
            return new Date(iso).toLocaleString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return iso;
        }
    };

    return (
        <div className="stellage-lightbox-overlay">
            <div className="stellage-lightbox-content" onClick={(e) => e.stopPropagation()}>
                {/* Header Controls */}
                <div className="stellage-lightbox-header">
                    <div className="stellage-lightbox-title">{originalName}</div>
                    <div className="stellage-lightbox-toolbar">
                        <button className="stellage-lightbox-btn" onClick={handleZoomOut} title="Уменьшить">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                        </button>
                        <span className="stellage-lightbox-zoom-label">{Math.round(zoom * 100)}%</span>
                        <button className="stellage-lightbox-btn" onClick={handleZoomIn} title="Увеличить">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                        </button>
                        <button className="stellage-lightbox-btn" onClick={handleRotate} title="Повернуть">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4v6h-6" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                        </button>
                        <button className="stellage-lightbox-btn" onClick={handleReset} title="Сбросить масштаб">
                            1:1
                        </button>
                        <button
                            className={`stellage-lightbox-btn ${showMeta ? "active" : ""}`}
                            onClick={() => setShowMeta(!showMeta)}
                            title="Метаданные"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="11" />
                                <circle cx="12" cy="7.5" r="1" fill="currentColor" />
                            </svg>
                        </button>
                        <button className="stellage-lightbox-btn close-btn" onClick={onClose} title="Закрыть (Esc)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Main View Area */}
                <div className="stellage-lightbox-body">
                    <div
                        className="stellage-lightbox-viewport"
                        ref={viewportRef}
                        onMouseDown={handleMouseDown}
                    >
                        {loading && <div className="lightbox-status-notice">Загрузка изображения…</div>}
                        {failed && <div className="lightbox-status-notice error">Не удалось загрузить изображение из S3</div>}
                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={alt}
                                className="stellage-lightbox-img"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                style={{
                                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom}) rotate(${rotation}deg)`,
                                    cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                                    transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                                    userSelect: "none",
                                }}
                            />
                        )}
                    </div>

                    {/* Meta info panel */}
                    {showMeta && (
                        <div className="stellage-lightbox-meta-panel">
                            <div className="stellage-lightbox-meta-title">Инспектор файла</div>
                            <div className="stellage-lightbox-meta-row">
                                <span className="label">Имя:</span>
                                <span className="val">{originalName}</span>
                            </div>
                            <div className="stellage-lightbox-meta-row">
                                <span className="label">Размер:</span>
                                <span className="val">{sizeBytes ? formatBytes(sizeBytes) : "—"}</span>
                            </div>
                            <div className="stellage-lightbox-meta-row">
                                <span className="label">MIME тип:</span>
                                <span className="val">{mime || "image/jpeg"}</span>
                            </div>
                            <div className="stellage-lightbox-meta-row">
                                <span className="label">Загружен:</span>
                                <span className="val">{formatDate(createdAt)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
