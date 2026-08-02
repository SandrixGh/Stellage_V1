import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/instance";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { formatCount } from "../../utils/formatCount";
import "./LikeButton.css";

interface LikeButtonProps {
    templateId?: string;
    instanceId?: string;
    initialLikesCount?: number;
    initialIsLiked?: boolean;
    className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
    templateId,
    instanceId,
    initialLikesCount = 0,
    initialIsLiked = false,
    className = "",
}) => {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [likesCount, setLikesCount] = useState(initialLikesCount);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setLikesCount(initialLikesCount);
    }, [initialLikesCount]);

    useEffect(() => {
        setIsLiked(initialIsLiked);
    }, [initialIsLiked]);

    const endpoint = templateId
        ? `/social/template-likes/${templateId}`
        : instanceId
            ? `/social/box-likes/${instanceId}`
            : null;

    useEffect(() => {
        if (!endpoint || !isAuthenticated) return;
        api.get<{ likes: number; is_liked: boolean | null }>(endpoint)
            .then((res) => {
                if (typeof res.data.likes === "number") setLikesCount(res.data.likes);
                if (typeof res.data.is_liked === "boolean") setIsLiked(res.data.is_liked);
            })
            .catch(() => {});
    }, [endpoint, isAuthenticated]);

    const handleToggleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }
        if (!endpoint || isLoading) return;

        setIsLoading(true);
        const nextLiked = !isLiked;
        const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

        // Optimistic UI update
        setIsLiked(nextLiked);
        setLikesCount(nextCount);

        const syncStore = (cnt: number) => {
            if (instanceId) {
                useStellageStore.getState().updateBoxLikes(instanceId, cnt);
            }
            if (templateId) {
                useStellageStore.getState().updateTemplateLikes(templateId, cnt);
            }
        };

        syncStore(nextCount);

        try {
            if (nextLiked) {
                const res = await api.post<{ is_liked: boolean; likes: number }>(endpoint);
                setLikesCount(res.data.likes);
                setIsLiked(res.data.is_liked);
                syncStore(res.data.likes);
            } else {
                const res = await api.delete<{ is_liked: boolean; likes: number }>(endpoint);
                setLikesCount(res.data.likes);
                setIsLiked(res.data.is_liked);
                syncStore(res.data.likes);
            }
        } catch {
            // Rollback on error
            setIsLiked(!nextLiked);
            setLikesCount(likesCount);
            syncStore(likesCount);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            className={`like-button-btn ${isLiked ? "is-liked" : ""} ${className}`}
            onClick={handleToggleLike}
            title={isLiked ? "Убрать лайк" : "Поставить лайк"}
        >
            <svg
                className="like-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <span className="like-count">{formatCount(likesCount)}</span>
        </button>
    );
};
