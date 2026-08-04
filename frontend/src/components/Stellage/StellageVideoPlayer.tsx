import { useState, useRef, useEffect } from "react";
import { getAssetUrl } from "../../api/assets";
import "./StellageVideoPlayer.css";

interface StellageVideoPlayerProps {
    assetId: string;
    title?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITY_OPTIONS = ["480p", "720p", "1080p", "Original (Auto)"];

export const StellageVideoPlayer = ({ assetId, title }: StellageVideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [quality, setQuality] = useState("Original (Auto)");
    const [qualityToast, setQualityToast] = useState<string | null>(null);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [hideControls, setHideControls] = useState(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        (async () => {
            try {
                const target = await getAssetUrl(assetId);
                if (!cancelled) {
                    setVideoUrl(target.url);
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

    // Fullscreen change event listener
    useEffect(() => {
        const handleFSChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFSChange);
        return () => document.removeEventListener("fullscreenchange", handleFSChange);
    }, []);

    // Keyboard Shortcuts (ArrowLeft = -5s, ArrowRight = +5s, Space/K = toggle, F = fullscreen)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === "input" || activeTag === "textarea") return;

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (videoRef.current) {
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
                }
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                if (videoRef.current) {
                    videoRef.current.currentTime = Math.min(
                        videoRef.current.duration || 0,
                        videoRef.current.currentTime + 5
                    );
                }
            } else if (e.key === " " || e.key === "k" || e.key === "K") {
                e.preventDefault();
                togglePlay();
            } else if (e.key === "f" || e.key === "F") {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === "m" || e.key === "M") {
                e.preventDefault();
                toggleMute();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, isMuted, volume]);

    // Auto-hide controls when idle in fullscreen or playing
    const handleMouseMove = () => {
        setHideControls(false);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        if (isPlaying) {
            hideTimeoutRef.current = setTimeout(() => {
                setHideControls(true);
            }, 2500);
        }
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);
        const handleEnded = () => {
            setIsPlaying(false);
            setHideControls(false);
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("ended", handleEnded);

        return () => {
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("ended", handleEnded);
        };
    }, [videoUrl]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = val;
            setCurrentTime(val);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (videoRef.current) {
            videoRef.current.volume = val;
            setIsMuted(val === 0);
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        if (isMuted) {
            videoRef.current.volume = volume || 0.5;
            setIsMuted(false);
        } else {
            videoRef.current.volume = 0;
            setIsMuted(true);
        }
    };

    const changeSpeed = (newSpeed: number) => {
        setSpeed(newSpeed);
        if (videoRef.current) {
            videoRef.current.playbackRate = newSpeed;
        }
        setShowSpeedMenu(false);
    };

    const changeQuality = (q: string) => {
        setQuality(q);
        setShowQualityMenu(false);
        setQualityToast(`Качество: ${q}`);
        setTimeout(() => setQualityToast(null), 2500);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds)) return "0:00";
        const mins = Math.floor(timeInSeconds / 60);
        const secs = Math.floor(timeInSeconds % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    if (loading) {
        return <div className="stellage-video-skeleton">Загрузка видеоплеера…</div>;
    }

    if (failed || !videoUrl) {
        return <div className="stellage-video-skeleton error">Не удалось загрузить видео из S3</div>;
    }

    const qualityClass = `quality-${quality.split(" ")[0].toLowerCase()}`;

    return (
        <div
            className={`stellage-video-container ${qualityClass} ${hideControls ? "hide-controls" : ""}`}
            ref={containerRef}
            onMouseMove={handleMouseMove}
        >
            {qualityToast && (
                <div className="stellage-video-quality-toast">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>{qualityToast}</span>
                </div>
            )}

            <video
                ref={videoRef}
                src={videoUrl}
                className="stellage-video-element"
                onClick={togglePlay}
            />

            {/* Center Pause/Play Overlay Badge */}
            {!isPlaying && (
                <button type="button" className="stellage-video-center-badge" onClick={togglePlay} title="Воспроизвести (Пробел)">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                </button>
            )}

            {title && <div className="stellage-video-title-badge">{title}</div>}

            <div className="stellage-video-controls">
                {/* Progress bar */}
                <div className="stellage-video-progress-wrapper">
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        className="stellage-video-progress"
                    />
                    <div
                        className="stellage-video-progress-fill"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                </div>

                <div className="stellage-video-actions">
                    <div className="stellage-video-actions-left">
                        {/* Play/Pause Button */}
                        <button className="stellage-video-btn" onClick={togglePlay} title={isPlaying ? "Пауза" : "Воспроизвести"}>
                            {isPlaying ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" rx="1" />
                                    <rect x="14" y="4" width="4" height="16" rx="1" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )}
                        </button>

                        {/* Volume Controls */}
                        <button className="stellage-video-btn" onClick={toggleMute} title={isMuted ? "Включить звук" : "Выключить звук"}>
                            {isMuted || volume === 0 ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                            )}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="stellage-video-volume-slider"
                        />

                        {/* Timestamps */}
                        <span className="stellage-video-time">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="stellage-video-actions-right">
                        {/* Speed selector */}
                        <div className="stellage-video-dropdown-container">
                            <button
                                className="stellage-video-btn text-btn"
                                onClick={() => {
                                    setShowSpeedMenu(!showSpeedMenu);
                                    setShowQualityMenu(false);
                                }}
                            >
                                {speed}x
                            </button>
                            {showSpeedMenu && (
                                <div className="stellage-video-dropdown">
                                    <div className="stellage-video-dropdown-title">Скорость</div>
                                    {SPEED_OPTIONS.map((s) => (
                                        <button
                                            key={s}
                                            className={`stellage-video-dropdown-item ${speed === s ? "active" : ""}`}
                                            onClick={() => changeSpeed(s)}
                                        >
                                            {s}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quality selector */}
                        <div className="stellage-video-dropdown-container">
                            <button
                                className="stellage-video-btn text-btn"
                                onClick={() => {
                                    setShowQualityMenu(!showQualityMenu);
                                    setShowSpeedMenu(false);
                                }}
                            >
                                {quality.split(" ")[0]}
                            </button>
                            {showQualityMenu && (
                                <div className="stellage-video-dropdown">
                                    <div className="stellage-video-dropdown-title">Качество</div>
                                    {QUALITY_OPTIONS.map((q) => (
                                        <button
                                            key={q}
                                            className={`stellage-video-dropdown-item ${quality === q ? "active" : ""}`}
                                            onClick={() => changeQuality(q)}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Fullscreen button */}
                        <button className="stellage-video-btn" onClick={toggleFullscreen} title="Полноэкранный режим">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {isFullscreen ? (
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                                ) : (
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StellageVideoLightbox = ({
    assetId,
    title,
    onClose,
}: {
    assetId: string;
    title?: string;
    onClose: () => void;
}) => {
    return (
        <div className="stellage-lightbox-overlay" onClick={onClose}>
            <div className="stellage-video-lightbox-content" onClick={(e) => e.stopPropagation()}>
                <div className="stellage-lightbox-header">
                    <div className="stellage-lightbox-title">{title || "Видео"}</div>
                    <button className="stellage-lightbox-btn close-btn" onClick={onClose} title="Закрыть (Esc)">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="stellage-video-lightbox-body">
                    <StellageVideoPlayer assetId={assetId} title={title} />
                </div>
            </div>
        </div>
    );
};
