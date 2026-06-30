import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { BoxDetailModal } from "../Box/BoxDetailModal";
import { onlineStatus, isOnline } from "../../utils/onlineStatus";
import type { Box } from "../../types/Stellage/boxes";
import "./ProfilePage.css";

export const ProfilePage = () => {
    const { user, isAuthenticated } = useAuthStore();
    const { mainShelf, fetchMainShelf } = useStellageStore();
    const [openedBox, setOpenedBox] = useState<Box | null>(null);

    useEffect(() => {
        if (isAuthenticated) fetchMainShelf();
    }, [isAuthenticated, fetchMainShelf]);

    if (!isAuthenticated || !user) {
        return (
            <div className="profile-gate">
                <div className="profile-gate-visual">
                    <WireframeBox size={240} />
                </div>
                <div className="profile-gate-content">
                    <h1 className="profile-gate-title">Профиль</h1>
                    <p className="profile-gate-sub">
                        Войдите в аккаунт, чтобы увидеть профиль и стеллаж.
                    </p>
                    <Link to="/login" className="profile-gate-btn">Войти</Link>
                </div>
            </div>
        );
    }

    const displayName = user.nickname?.trim() || user.email;
    const monogram = displayName?.trim()?.[0]?.toUpperCase() ?? "S";
    const online = isOnline(user.last_seen_at);

    return (
        <div className="profile-page">
            <header className="profile-hero">
                <div className="profile-avatar" aria-hidden="true">
                    <span>{monogram}</span>
                </div>
                <div className="profile-identity">
                    <p className="profile-eyebrow">Профиль</p>
                    <h1 className="profile-email">{displayName}</h1>
                    <div className="profile-meta">
                        {user.username ? (
                            <span className="profile-chip profile-chip-username">@{user.username}</span>
                        ) : (
                            <span className="profile-chip profile-chip-muted">username не задан</span>
                        )}
                        <span className={`profile-chip ${online ? "profile-chip-status" : "profile-chip-offline"}`}>
                            {onlineStatus(user.last_seen_at)}
                        </span>
                    </div>
                </div>
            </header>

            <section className="profile-shelf-section">
                {mainShelf ? (
                    <ShelfView
                        shelf={mainShelf}
                        editable={false}
                        onOpen={setOpenedBox}
                    />
                ) : (
                    <div className="profile-shelf-empty">
                        <p>Стеллаж пока не создан.</p>
                        <Link to="/my-stellage" className="profile-gate-btn">Открыть мой стеллаж</Link>
                    </div>
                )}
            </section>

            <BoxDetailModal box={openedBox} onClose={() => setOpenedBox(null)} />
        </div>
    );
};
