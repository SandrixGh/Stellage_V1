import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/instance";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { fixLocalS3Url } from "../../api/assets";
import { Avatar } from "../../components/UI/Avatar";
import { DeveloperBadge } from "../../components/UI/DeveloperBadge";
import { ProfileStatsRow } from "../../components/Profile/ProfileStatsRow";
import { FollowButton } from "../../components/Profile/FollowButton";
import { FollowListModal } from "../../components/Profile/FollowListModal";
import { GiftsGrid } from "../../components/Profile/GiftsGrid";
import { GiftCoinsModal } from "../../components/Profile/GiftCoinsModal";
import { StellaCoinIcon } from "../../components/UI/StellaCoinIcon";
import { useAuthStore } from "../../store/useAuthStore";
import { getFollowCounts } from "../../api/social";
import { getPublicGifts, type GiftItem } from "../../api/profile";
import { onlineStatus, isOnline } from "../../utils/onlineStatus";
import type { PublicProfile } from "../../types/Profile/profile";
import "./ProfilePage.css";

type ProfileTab = "shelf" | "gifts";

export const PublicProfilePage = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");
    const [followers, setFollowers] = useState<number | undefined>(undefined);
    const [following, setFollowing] = useState<number | undefined>(undefined);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followList, setFollowList] = useState<"followers" | "following" | null>(null);

    const [activeTab, setActiveTab] = useState<ProfileTab>("shelf");
    const [gifts, setGifts] = useState<GiftItem[]>([]);
    const [giftsLoading, setGiftsLoading] = useState(false);

    const [isGifting, setIsGifting] = useState(false);

    useEffect(() => {
        if (!username) return;
        getFollowCounts(username)
            .then((c) => {
                setFollowers(c.followers);
                setFollowing(c.following);
                setIsFollowing(c.is_following === true);
            })
            .catch(() => {});
    }, [username]);

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

    // Подгрузка подарков чужого профиля
    useEffect(() => {
        if (!username) return;
        setGiftsLoading(true);
        getPublicGifts(username)
            .then(setGifts)
            .catch(() => setGifts([]))
            .finally(() => setGiftsLoading(false));
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
    const online = isOnline(profile.last_seen_at);

    return (
        <div className="profile-page">
            {/* ИМЕРСИВНАЯ ШАПКА ПРОФИЛЯ */}
            <header className="profile-hero-card">
                <div className="profile-hero-banner" data-yandex-image-search-skip="true" data-no-search="true">
                    {profile.banner_url && (
                        <img
                            src={fixLocalS3Url(profile.banner_url)}
                            alt=""
                            className="profile-banner-img"
                            style={{ objectPosition: `center ${profile?.banner_pos_y ?? 50}%` }}
                        />
                    )}
                    <div className="profile-banner-tile-overlay" />
                </div>
                <div className="profile-hero-body">
                    <div className="profile-hero-main-row">
                        {/* LEFT COLUMN: Avatar + Identity */}
                        <div className="profile-identity-left">
                            <div className="profile-avatar-wrap">
                                <Avatar url={profile.avatar_url} name={displayName} size={92} className="profile-main-avatar" />
                                <span className={`profile-status-dot ${online ? "online" : "offline"}`} />
                            </div>
                            <div className="profile-identity">
                                <div className="profile-title-row">
                                    <h1 className="profile-display-name">{displayName}</h1>
                                    {profile.is_developer && <DeveloperBadge />}
                                </div>
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
                                {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Stats & Tabs */}
                        <div className="profile-identity-right">
                            <ProfileStatsRow
                                stats={profile.stats}
                                followers={followers}
                                following={following}
                                onOpenFollowers={() => profile.username && setFollowList("followers")}
                                onOpenFollowing={() => profile.username && setFollowList("following")}
                            />

                            <div className="profile-tabs-bar" role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "shelf"}
                                    className={`profile-tab-btn${activeTab === "shelf" ? " active" : ""}`}
                                    onClick={() => setActiveTab("shelf")}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect width="18" height="18" x="3" y="3" rx="2" />
                                        <path d="M3 9h18" />
                                        <path d="M3 15h18" />
                                        <path d="M9 3v18" />
                                        <path d="M15 3v18" />
                                    </svg>
                                    <span>Стеллаж</span>
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "gifts"}
                                    className={`profile-tab-btn${activeTab === "gifts" ? " active" : ""}`}
                                    onClick={() => setActiveTab("gifts")}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 12v10H4V12" />
                                        <path d="M22 7H2v5h20V7z" />
                                        <path d="M12 22V7" />
                                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                                    </svg>
                                    <span>Подарки</span>
                                    {gifts.length > 0 && <span className="profile-tab-badge">{gifts.length}</span>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {profile.username && !!currentUser && currentUser.id !== profile.id && (
                        <div className="profile-actions">
                            <FollowButton
                                username={profile.username}
                                isFollowing={isFollowing}
                                onChange={(nowFollowing, count) => {
                                    setIsFollowing(nowFollowing);
                                    setFollowers(count);
                                }}
                            />
                            <button
                                type="button"
                                className="profile-action-btn secondary"
                                onClick={() => navigate(`/messages/${profile.username}`)}
                            >
                                Написать
                            </button>

                            <button
                                type="button"
                                className="profile-action-btn accent"
                                onClick={() => setIsGifting(true)}
                            >
                                <span>Подарить Stellacoin</span>
                                <StellaCoinIcon size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* СОДЕРЖИМОЕ ВКЛАДОК */}
            <div className="profile-tab-content">
                {activeTab === "shelf" && (
                    <section className="profile-shelf-section">
                        {profile.shelf ? (
                            <ShelfView
                                shelf={profile.shelf}
                                editable={false}
                                onOpen={(box) => navigate(`/box/instance/${box.id}`)}
                            />
                        ) : (
                            <div className="profile-shelf-empty">
                                <p>У пользователя нет публичного стеллажа.</p>
                            </div>
                        )}
                    </section>
                )}

                {activeTab === "gifts" && (
                    <section className="profile-gifts-section">
                        {giftsLoading ? (
                            <div className="profile-loading-gifts">Загрузка витрины подарков…</div>
                        ) : (
                            <GiftsGrid
                                gifts={gifts}
                                isOwner={false}
                            />
                        )}
                    </section>
                )}
            </div>

            {followList && profile.username && (
                <FollowListModal
                    username={profile.username}
                    mode={followList}
                    onClose={() => setFollowList(null)}
                />
            )}

            {isGifting && profile.username && (
                <GiftCoinsModal
                    recipientUsername={profile.username}
                    recipientNickname={profile.nickname}
                    recipientAvatarUrl={profile.avatar_url}
                    onClose={() => setIsGifting(false)}
                    onSuccess={() => {
                        if (profile.username) {
                            getPublicGifts(profile.username).then(setGifts).catch(() => {});
                        }
                    }}
                />
            )}
        </div>
    );
};
