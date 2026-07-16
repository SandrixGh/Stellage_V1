import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getFollowers, getFollowing } from "../../api/social";
import { Avatar } from "../UI/Avatar";
import type { PublicUser } from "../../types/Profile/profile";
import "./FollowListModal.css";

interface FollowListModalProps {
    username: string;
    mode: "followers" | "following";
    onClose: () => void;
}

const TITLE = {
    followers: "Подписчики",
    following: "Подписки",
};

/** Список людей (подписчики или подписки) с аватарами и ссылками на профиль. */
export const FollowListModal = ({ username, mode, onClose }: FollowListModalProps) => {
    const [users, setUsers] = useState<PublicUser[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = mode === "followers" ? getFollowers : getFollowing;
        load(username)
            .then((list) => !cancelled && setUsers(list))
            .catch(() => !cancelled && setUsers([]));
        return () => {
            cancelled = true;
        };
    }, [username, mode]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return createPortal(
        <div className="follist-overlay" onClick={onClose}>
            <div className="follist" onClick={(e) => e.stopPropagation()}>
                <div className="follist-head">
                    <h2 className="follist-title">{TITLE[mode]}</h2>
                    <button type="button" className="follist-close" aria-label="Закрыть" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="follist-body">
                    {users === null ? (
                        <p className="follist-empty">Загрузка…</p>
                    ) : users.length === 0 ? (
                        <p className="follist-empty">
                            {mode === "followers" ? "Пока нет подписчиков." : "Пока никого нет в подписках."}
                        </p>
                    ) : (
                        users.map((u) => {
                            const title = u.nickname?.trim() || u.username || "Без имени";
                            const row = (
                                <>
                                    <Avatar url={u.avatar_url} name={title} size={40} />
                                    <div className="follist-info">
                                        <span className="follist-name">{title}</span>
                                        {u.username && <span className="follist-username">@{u.username}</span>}
                                    </div>
                                </>
                            );
                            return u.username ? (
                                <Link
                                    key={u.id}
                                    to={`/u/${u.username}`}
                                    className="follist-item"
                                    onClick={onClose}
                                >
                                    {row}
                                </Link>
                            ) : (
                                <div key={u.id} className="follist-item">
                                    {row}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
};
