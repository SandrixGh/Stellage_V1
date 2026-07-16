import { useEffect, useState } from "react";
import { followUser, getFollowCounts, unfollowUser } from "../../api/social";
import "./FollowButton.css";

interface FollowButtonProps {
    username: string;
    /** Скрываем кнопку на своём профиле и для анонима, но счётчики показываем. */
    canFollow: boolean;
}

/**
 * Счётчики подписчиков/подписок + кнопка подписки. Сам подтягивает актуальные
 * counts по username; действие обновляет их оптимистично и откатывается при
 * ошибке.
 */
export const FollowButton = ({ username, canFollow }: FollowButtonProps) => {
    const [followers, setFollowers] = useState(0);
    const [following, setFollowing] = useState(0);
    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setReady(false);
        getFollowCounts(username)
            .then((c) => {
                if (cancelled) return;
                setFollowers(c.followers);
                setFollowing(c.following);
                setIsFollowing(c.is_following);
                setReady(true);
            })
            .catch(() => !cancelled && setReady(true));
        return () => {
            cancelled = true;
        };
    }, [username]);

    const toggle = async () => {
        if (busy) return;
        setBusy(true);
        const wasFollowing = isFollowing === true;
        // Оптимистично.
        setIsFollowing(!wasFollowing);
        setFollowers((n) => n + (wasFollowing ? -1 : 1));
        try {
            const res = wasFollowing
                ? await unfollowUser(username)
                : await followUser(username);
            setIsFollowing(res.is_following);
            setFollowers(res.followers);
        } catch {
            // Откат.
            setIsFollowing(wasFollowing);
            setFollowers((n) => n + (wasFollowing ? 1 : -1));
        } finally {
            setBusy(false);
        }
    };

    if (!ready) return null;

    return (
        <div className="follow-block">
            <div className="follow-counts">
                <span className="follow-count">
                    <b>{followers}</b> {followers === 1 ? "подписчик" : "подписчиков"}
                </span>
                <span className="follow-count">
                    <b>{following}</b> подписок
                </span>
            </div>
            {canFollow && (
                <button
                    type="button"
                    className={`follow-btn${isFollowing ? " following" : ""}`}
                    onClick={toggle}
                    disabled={busy}
                >
                    {isFollowing ? "Вы подписаны" : "Подписаться"}
                </button>
            )}
        </div>
    );
};
