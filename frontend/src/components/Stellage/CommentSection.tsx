import React, { useEffect, useState } from "react";
import { api } from "../../api/instance";
import { useAuthStore } from "../../store/useAuthStore";
import type { CommentItem } from "../../types/Stellage/boxes";
import "./CommentSection.css";

interface CommentSectionProps {
    templateId?: string;
    instanceId?: string;
    onCommentAdded?: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
    templateId,
    instanceId,
    onCommentAdded,
}) => {
    const { user, isAuthenticated } = useAuthStore();
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [text, setText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchComments = async () => {
            setIsLoading(true);
            try {
                const params: Record<string, string> = {};
                if (templateId) params.template_id = templateId;
                if (instanceId) params.instance_id = instanceId;

                const res = await api.get<CommentItem[]>("/social/comments", { params });
                setComments(res.data);
            } catch (err) {
                console.error("Failed to load comments", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchComments();
    }, [templateId, instanceId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const body: Record<string, string | null> = {
                template_id: templateId || null,
                instance_id: instanceId || null,
                text: text.trim(),
            };
            const res = await api.post<CommentItem>("/social/comments", body);
            setComments((prev) => [...prev, res.data]);
            setText("");
            if (onCommentAdded) onCommentAdded();
        } catch (err) {
            console.error("Failed to post comment", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        try {
            await api.delete(`/social/comments/${commentId}`);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
        } catch (err) {
            console.error("Failed to delete comment", err);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }).format(d);
    };

    return (
        <div className="comment-section">
            <h4 className="comment-section-title">
                Комментарии ({comments.length})
            </h4>

            <div className="comment-list">
                {isLoading ? (
                    <div className="comment-status">Загрузка комментариев...</div>
                ) : comments.length === 0 ? (
                    <div className="comment-empty">Пока нет комментариев. Будьте первыми!</div>
                ) : (
                    comments.map((c) => {
                        const authorName = c.author.nickname || c.author.username || "Аноним";
                        const isAuthor = user && user.id === c.user_id;

                        return (
                            <div key={c.id} className="comment-item">
                                <div className="comment-avatar">
                                    {c.author.avatar_url ? (
                                        <img src={c.author.avatar_url} alt={authorName} />
                                    ) : (
                                        <span className="comment-monogram">
                                            {authorName.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="comment-content">
                                    <div className="comment-header">
                                        <span className="comment-author">{authorName}</span>
                                        <span className="comment-time">{formatDate(c.created_at)}</span>
                                        {isAuthor && (
                                            <button
                                                type="button"
                                                className="comment-delete-btn"
                                                onClick={() => handleDelete(c.id)}
                                                title="Удалить комментарий"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <p className="comment-text">{c.text}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {isAuthenticated ? (
                <form className="comment-form" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="comment-input"
                        placeholder="Написать комментарий..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={500}
                    />
                    <button
                        type="submit"
                        className="comment-submit-btn"
                        disabled={!text.trim() || isSubmitting}
                    >
                        Отправить
                    </button>
                </form>
            ) : (
                <div className="comment-auth-hint">
                    Войдите в аккаунт, чтобы оставить комментарий.
                </div>
            )}
        </div>
    );
};
