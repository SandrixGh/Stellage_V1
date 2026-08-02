import { useEffect, useState } from "react";
import { getBoxLikes, likeBox, unlikeBox } from "../../api/social";
import { useStellageStore } from "../../store/useStellageStore";
import { formatCount } from "../../utils/formatCount";
import "./LikeButton.css";

interface LikeButtonProps {
    instanceId: string;
    /** Может ли текущий пользователь лайкать (авторизован). Аноним видит
     *  счётчик, но без действия. */
    canLike: boolean;
}

/**
 * Сердце-лайк со счётчиком для коробки. Сам подтягивает актуальное состояние;
 * toggle обновляется оптимистично и откатывается при ошибке.
 */
export const LikeButton = ({ instanceId, canLike }: LikeButtonProps) => {
    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setReady(false);
        getBoxLikes(instanceId)
            .then((s) => {
                if (cancelled) return;
                setLikes(s.likes);
                setIsLiked(s.is_liked === true);
                setReady(true);
            })
            .catch(() => !cancelled && setReady(true));
        return () => {
            cancelled = true;
        };
    }, [instanceId]);

    const toggle = async () => {
        if (busy || !canLike) return;
        setBusy(true);
        const was = isLiked;
        const nextLiked = !was;
        const nextLikes = likes + (was ? -1 : 1);

        setIsLiked(nextLiked);
        setLikes(nextLikes);
        useStellageStore.getState().updateBoxLikes(instanceId, nextLikes);

        try {
            const res = was ? await unlikeBox(instanceId) : await likeBox(instanceId);
            setIsLiked(res.is_liked);
            setLikes(res.likes);
            useStellageStore.getState().updateBoxLikes(instanceId, res.likes);
        } catch {
            setIsLiked(was);
            const rollbackLikes = likes;
            setLikes(rollbackLikes);
            useStellageStore.getState().updateBoxLikes(instanceId, rollbackLikes);
        } finally {
            setBusy(false);
        }
    };

    if (!ready) return null;

    return (
        <button
            type="button"
            className={`like-btn${isLiked ? " liked" : ""}${canLike ? "" : " readonly"}`}
            onClick={toggle}
            disabled={busy || !canLike}
            aria-pressed={isLiked}
            aria-label={isLiked ? "Убрать лайк" : "Нравится"}
            title={canLike ? undefined : "Войдите, чтобы оценить"}
        >
            <span className="like-heart" aria-hidden="true">
                {isLiked ? "♥" : "♡"}
            </span>
            <span className="like-count" title={`${likes} лайков`}>{formatCount(likes)}</span>
        </button>
    );
};
