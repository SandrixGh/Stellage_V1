import { useEffect, useState } from "react";
import { fixLocalS3Url } from "../../api/assets";
import "./Avatar.css";

interface AvatarProps {
    /** Presigned-ссылка на аватар; null/пусто — показываем монограмму. */
    url?: string | null;
    /** Имя для монограммы (первая буква) и alt. */
    name?: string | null;
    size?: number;
    className?: string;
}

/**
 * Аватар пользователя: реальное фото по presigned-ссылке либо монограмма
 * (первая буква имени) как фолбэк. presigned-ссылка может истечь — при ошибке
 * загрузки тихо откатываемся на монограмму.
 */
export const Avatar = ({ url, name, size = 96, className = "" }: AvatarProps) => {
    const [failed, setFailed] = useState(false);
    const monogram = name?.trim()?.[0]?.toUpperCase() ?? "S";

    // Новый url — сбрасываем флаг ошибки, пробуем показать снова.
    useEffect(() => {
        setFailed(false);
    }, [url]);

    const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };

    if (url && !failed) {
        return (
            <div className={`avatar ${className}`} style={style} data-yandex-image-search-skip="true" data-no-search="true">
                <img
                    className="avatar-img"
                    src={fixLocalS3Url(url)}
                    alt={name ?? "Аватар"}
                    onError={() => setFailed(true)}
                />
                <div className="avatar-tile-overlay" />
            </div>
        );
    }

    return (
        <div className={`avatar avatar-monogram ${className}`} style={style} aria-hidden="true">
            <span>{monogram}</span>
        </div>
    );
};
