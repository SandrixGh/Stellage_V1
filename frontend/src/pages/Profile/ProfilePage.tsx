import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { Avatar } from "../../components/UI/Avatar";
import { DeveloperBadge } from "../../components/UI/DeveloperBadge";
import { ProfileStatsRow } from "../../components/Profile/ProfileStatsRow";
import { FollowListModal } from "../../components/Profile/FollowListModal";
import { BoxDetailModal } from "../Box/BoxDetailModal";
import { GiftsGrid } from "../../components/Profile/GiftsGrid";
import { BannerEditorModal } from "../../components/Profile/BannerEditorModal";
import { getMyProfile, getPublicProfile, getPublicGifts, type GiftItem } from "../../api/profile";
import { getFollowCounts } from "../../api/social";
import type { Box } from "../../types/Stellage/boxes";
import type { PublicProfile } from "../../types/Profile/profile";
import "./ProfilePage.css";

type ProfileTab = "shelf" | "gifts";

export const ProfilePage = () => {
    const { username } = useParams<{ username?: string }>();
    const me = useAuthStore((s) => s.user);

    const isOwner = !username || (me?.username && me.username === username);

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [openedBox, setOpenedBox] = useState<Box | null>(null);
    const [followers, setFollowers] = useState<number | undefined>(undefined);
    const [following, setFollowing] = useState<number | undefined>(undefined);
    const [followList, setFollowList] = useState<"followers" | "following" | null>(null);

    const [activeTab, setActiveTab] = useState<ProfileTab>("shelf");
    const [gifts, setGifts] = useState<GiftItem[]>([]);
    const [giftsLoading, setGiftsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (isOwner) {
                const data = await getMyProfile();
                setProfile(data);
                if (data.username) {
                    setGiftsLoading(true);
                    const g = await getPublicGifts(data.username);
                    setGifts(g);
                    setGiftsLoading(false);
                }
            } else if (username) {
                setGiftsLoading(true);
                const [data, g] = await Promise.all([
                    getPublicProfile(username),
                    getPublicGifts(username),
                ]);
                setProfile(data);
                setGifts(g);
                setGiftsLoading(false);
            }
        } catch {
            setError("Пользователь не найден или профиль недоступен.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [username, me?.username]);

    useEffect(() => {
        const u = profile?.username;
        if (!u) return;
        getFollowCounts(u)
            .then((c) => {
                setFollowers(c.followers);
                setFollowing(c.following);
            })
            .catch(() => {});
    }, [profile?.username]);

    if (loading) {
        return (
            <div className="profile-page-loading">
                <div className="profile-spinner" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="profile-page-error">
                <h2>Ошибка</h2>
                <p>{error || "Не удалось загрузить профиль"}</p>
                <Link to="/" className="profile-back-link">На главную</Link>
            </div>
        );
    }

    const { username: profileUsername, nickname, last_seen_at, avatar_url, banner_url, bio, stats, shelf } = profile;
    const displayName = nickname?.trim() || profileUsername || "Пользователь";

    const isOnlineUser = Boolean(
        last_seen_at && (Date.now() - new Date(last_seen_at).getTime()) / 1000 < 300
    );

    const onlineStatusText = (lastSeenAt: string | null) => {
        if (!lastSeenAt) return "офлайн";
        const diffSec = (Date.now() - new Date(lastSeenAt).getTime()) / 1000;
        return diffSec < 300 ? "в сети" : "был(а) недавно";
    };

    const handleGiftVisibilityChanged = (instanceId: string, isPublic: boolean) => {
        setGifts((prev) =>
            prev.map((g) => (g.id === instanceId ? { ...g, is_gift_public: isPublic } : g))
        );
    };

    return (
        <div className="profile-page">
            <header className="profile-hero-card">
                <div className="profile-hero-banner" data-yandex-image-search-skip="true" data-no-search="true">
                    {banner_url && (
                        <img
                            src={banner_url}
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
                                <Avatar url={avatar_url} name={displayName} size={96} className="profile-main-avatar" />
                                <span className={`profile-status-dot ${isOnlineUser ? "online" : "offline"}`} />
                            </div>
                            <div className="profile-identity">
                                <div className="profile-title-row">
                                    <h1 className="profile-display-name">{displayName}</h1>
                                    {profile.is_developer && <DeveloperBadge />}
                                </div>
                                <div className="profile-meta">
                                    {profileUsername ? (
                                        <span className="profile-chip profile-chip-username">@{profileUsername}</span>
                                    ) : (
                                        <span className="profile-chip profile-chip-muted">username не задан</span>
                                    )}
                                    <span className={`profile-chip ${isOnlineUser ? "profile-chip-status" : "profile-chip-offline"}`}>
                                        {onlineStatusText(last_seen_at)}
                                    </span>
                                </div>
                                {bio && <p className="profile-bio">{bio}</p>}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Stats & Tabs */}
                        <div className="profile-identity-right">
                            {profile && (
                                <ProfileStatsRow
                                    stats={stats}
                                    followers={followers}
                                    following={following}
                                    onOpenFollowers={() => profileUsername && setFollowList("followers")}
                                    onOpenFollowing={() => profileUsername && setFollowList("following")}
                                />
                            )}

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
                </div>
            </header>

            {/* СОДЕРЖИМОЕ ВКЛАДОК */}
            <div className="profile-tab-content">
                {activeTab === "shelf" && (
                    <section className="profile-shelf-section">
                        {shelf ? (
                            <ShelfView
                                shelf={shelf}
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
                )}

                {activeTab === "gifts" && (
                    <section className="profile-gifts-section">
                        {giftsLoading ? (
                            <div className="profile-loading-gifts">Загрузка витрины подарков…</div>
                        ) : (
                            <GiftsGrid
                                gifts={gifts}
                                isOwner={Boolean(isOwner)}
                                onGiftVisibilityChanged={handleGiftVisibilityChanged}
                            />
                        )}
                    </section>
                )}
            </div>

            <BoxDetailModal box={openedBox} onClose={() => setOpenedBox(null)} />

            {followList && profileUsername && (
                <FollowListModal
                    username={profileUsername}
                    mode={followList}
                    onClose={() => setFollowList(null)}
                />
            )}

            <BannerEditorModal
                isOpen={isBannerModalOpen}
                onClose={() => setIsBannerModalOpen(false)}
                currentBannerUrl={banner_url}
                currentBannerPosY={profile?.banner_pos_y}
                avatarUrl={avatar_url}
                displayName={displayName}
                onSuccess={loadData}
            />
        </div>
    );
};
