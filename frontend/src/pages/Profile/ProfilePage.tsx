import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { Avatar } from "../../components/UI/Avatar";
import { ProfileStatsRow } from "../../components/Profile/ProfileStatsRow";
import { FollowListModal } from "../../components/Profile/FollowListModal";
import { BoxDetailModal } from "../Box/BoxDetailModal";
import { getMyProfile } from "../../api/profile";
import { getFollowCounts } from "../../api/social";
import { onlineStatus, isOnline } from "../../utils/onlineStatus";
import type { Box } from "../../types/Stellage/boxes";
import type { PublicProfile } from "../../types/Profile/profile";
import "./ProfilePage.css";

export const ProfilePage = () => {
    const { user, isAuthenticated } = useAuthStore();
    const { mainShelf, fetchMainShelf } = useStellageStore();
    const [openedBox, setOpenedBox] = useState<Box | null>(null);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [followers, setFollowers] = useState<number | undefined>(undefined);
    const [following, setFollowing] = useState<number | undefined>(undefined);
    const [followList, setFollowList] = useState<"followers" | "following" | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchMainShelf();
        getMyProfile().then(setProfile).catch(() => setProfile(null));
    }, [isAuthenticated, fetchMainShelf]);

    // Счётчики подписок для своего профиля (по своему username).
    useEffect(() => {
        if (!user?.username) return;
        getFollowCounts(user.username)
            .then((c) => {
                setFollowers(c.followers);
                setFollowing(c.following);
            })
            .catch(() => {});
    }, [user?.username]);

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
    const online = isOnline(user.last_seen_at);
    const bio = profile?.bio ?? user.bio;

    return (
        <div className="profile-page">
            <header className="profile-hero">
                <Avatar url={profile?.avatar_url} name={displayName} size={88} />
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
                    {bio && <p className="profile-bio">{bio}</p>}
                </div>
            </header>

            {profile && (
                <ProfileStatsRow
                    stats={profile.stats}
                    followers={followers}
                    following={following}
                    onOpenFollowers={() => user.username && setFollowList("followers")}
                    onOpenFollowing={() => user.username && setFollowList("following")}
                />
            )}

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

            {followList && user.username && (
                <FollowListModal
                    username={user.username}
                    mode={followList}
                    onClose={() => setFollowList(null)}
                />
            )}
        </div>
    );
};
