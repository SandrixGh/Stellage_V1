import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/instance";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { BoxDetailModal } from "../Box/BoxDetailModal";
import { onlineStatus, isOnline } from "../../utils/onlineStatus";
import type { Box } from "../../types/Stellage/boxes";
import type { PublicProfile } from "../../types/Profile/profile";
import "./ProfilePage.css";

export const PublicProfilePage = () => {
    const { username } = useParams<{ username: string }>();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");
    const [openedBox, setOpenedBox] = useState<Box | null>(null);

    useEffect(() => {
        if (!username) return;
        let cancelled = false;
        setStatus("loading");
        setProfile(null);

        (async () => {
            try {
                const res = await api.get<PublicProfile>(`/profile/public/${username}`);
                if (!cancelled) {
                    setProfile(res.data);
                    setStatus("ready");
                }
            } catch {
                if (!cancelled) setStatus("notfound");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [username]);

    if (status === "loading") {
        return <div className="status-info">Загрузка профиля...</div>;
    }

    if (status === "notfound" || !profile) {
        return (
            <div className="profile-gate">
                <div className="profile-gate-visual">
                    <WireframeBox size={240} />
                </div>
                <div className="profile-gate-content">
                    <h1 className="profile-gate-title">Профиль не найден</h1>
                    <p className="profile-gate-sub">
                        Пользователь @{username} не существует или скрыт.
                    </p>
                    <Link to="/search" className="profile-gate-btn">К поиску</Link>
                </div>
            </div>
        );
    }

    const displayName = profile.nickname?.trim() || profile.username || "Без имени";
    const monogram = displayName?.trim()?.[0]?.toUpperCase() ?? "S";
    const online = isOnline(profile.last_seen_at);

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
                        {profile.username ? (
                            <span className="profile-chip profile-chip-username">@{profile.username}</span>
                        ) : (
                            <span className="profile-chip profile-chip-muted">username не задан</span>
                        )}
                        <span className={`profile-chip ${online ? "profile-chip-status" : "profile-chip-offline"}`}>
                            {onlineStatus(profile.last_seen_at)}
                        </span>
                    </div>
                </div>
            </header>

            <section className="profile-shelf-section">
                {profile.shelf ? (
                    <ShelfView
                        shelf={profile.shelf}
                        editable={false}
                        onOpen={setOpenedBox}
                    />
                ) : (
                    <div className="profile-shelf-empty">
                        <p>У пользователя нет публичного стеллажа.</p>
                    </div>
                )}
            </section>

            <BoxDetailModal box={openedBox} onClose={() => setOpenedBox(null)} />
        </div>
    );
};
