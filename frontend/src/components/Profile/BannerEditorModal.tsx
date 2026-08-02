import { useState, useEffect, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { uploadBanner, updateBannerPosition, avatarErrorMessage } from "../../api/profile";
import { Avatar } from "../UI/Avatar";
import "./BannerEditorModal.css";

interface BannerEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBannerUrl?: string | null;
    currentBannerPosY?: number;
    avatarUrl?: string | null;
    displayName: string;
    onSuccess: () => void;
}

export const BannerEditorModal = ({
    isOpen,
    onClose,
    currentBannerUrl,
    currentBannerPosY = 50,
    avatarUrl,
    displayName,
    onSuccess,
}: BannerEditorModalProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [posY, setPosY] = useState<number>(50); // 0% to 100% vertical alignment
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        setPreviewUrl(currentBannerUrl ?? null);
        setPosY(currentBannerPosY ?? 50);
        setSelectedFile(null);
        setError(null);
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, currentBannerUrl, currentBannerPosY]);

    if (!isOpen) return null;

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setError(null);
    };

    const handleSave = async () => {
        if (!selectedFile && !currentBannerUrl) return;
        setIsUploading(true);
        setError(null);

        try {
            if (selectedFile) {
                await uploadBanner(selectedFile, posY);
            } else {
                await updateBannerPosition(posY);
            }
            onSuccess();
            onClose();
        } catch (err) {
            setError(avatarErrorMessage(err));
        } finally {
            setIsUploading(false);
        }
    };

    const displayBanner = previewUrl || currentBannerUrl;

    return createPortal(
        <div className="banner-modal-backdrop" onClick={onClose}>
            <div className="banner-modal-card" onClick={(e) => e.stopPropagation()}>
                <header className="banner-modal-header">
                    <h3 className="banner-modal-title">Настройка обложки профиля</h3>
                    <button type="button" className="banner-modal-close" onClick={onClose}>
                        ✕
                    </button>
                </header>

                <div className="banner-modal-body">
                    {/* Live Preview exact replica of Profile Hero Banner */}
                    <div className="banner-preview-box">
                        <div className="banner-preview-label">Предпросмотр в профиле</div>
                        <div className="banner-preview-image-wrap" data-yandex-image-search-skip="true" data-no-search="true">
                            {displayBanner && (
                                <img
                                    src={displayBanner}
                                    alt=""
                                    className="banner-preview-img"
                                    style={{ objectPosition: `center ${posY}%` }}
                                />
                            )}
                            <div className="banner-preview-tile-overlay" />
                        </div>
                        <div className="banner-preview-overlap">
                            <Avatar url={avatarUrl} name={displayName} size={64} className="banner-preview-avatar" />
                            <span className="banner-preview-name">{displayName}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="banner-controls">
                        <label className="banner-upload-btn">
                            <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                <circle cx="12" cy="13" r="3" />
                            </svg>
                            <span>Выбрать новое изображение</span>
                        </label>

                        {displayBanner && (
                            <div className="banner-slider-group">
                                <div className="banner-slider-header">
                                    <span>Выравнивание по вертикали:</span>
                                    <span>{posY}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={posY}
                                    onChange={(e) => setPosY(Number(e.target.value))}
                                    className="banner-range-input"
                                />
                            </div>
                        )}

                        {error && <div className="banner-modal-error">{error}</div>}
                    </div>
                </div>

                <footer className="banner-modal-footer">
                    <button type="button" className="banner-modal-btn ghost" onClick={onClose} disabled={isUploading}>
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="banner-modal-btn primary"
                        onClick={handleSave}
                        disabled={isUploading || (!selectedFile && !currentBannerUrl)}
                    >
                        {isUploading ? "Сохранение..." : "Сохранить обложку"}
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
};
