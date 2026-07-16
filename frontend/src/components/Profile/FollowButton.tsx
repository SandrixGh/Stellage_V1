import { useState } from "react";
import { followUser, unfollowUser } from "../../api/social";
import "./FollowButton.css";

interface FollowButtonProps {
    username: string;
    /** Текущее состояние подписки (из follow-counts профиля). */
    isFollowing: boolean;
    /** Сообщает новое состояние + число подписчиков наверх (обновить счётчик). */
    onChange: (isFollowing: boolean, followers: number) => void;
}

/**
 * Кнопка подписки/отписки. Счётчики живут в ряду статистики профиля — здесь
 * только действие; при клике отдаёт актуальное число подписчиков наверх.
 */
export const FollowButton = ({ username, isFollowing, onChange }: FollowButtonProps) => {
    const [busy, setBusy] = useState(false);

    const toggle = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const res = isFollowing
                ? await unfollowUser(username)
                : await followUser(username);
            onChange(res.is_following, res.followers);
        } catch {
            /* при ошибке состояние не меняем */
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className={`follow-btn${isFollowing ? " following" : ""}`}
            onClick={toggle}
            disabled={busy}
        >
            {isFollowing ? "Вы подписаны" : "Подписаться"}
        </button>
    );
};
