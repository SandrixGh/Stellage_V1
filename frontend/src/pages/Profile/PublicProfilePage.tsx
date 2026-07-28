import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/instance";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { Avatar } from "../../components/UI/Avatar";
import { ProfileStatsRow } from "../../components/Profile/ProfileStatsRow";
import { FollowButton } from "../../components/Profile/FollowButton";
import { FollowListModal } from "../../components/Profile/FollowListModal";
import { useAuthStore } from "../../store/useAuthStore";
import { getFollowCounts } from "../../api/social";
import { giftStellaCoins } from "../../api/profile";
import { onlineStatus, isOnline } from "../../utils/onlineStatus";
import type { PublicProfile } from "../../types/Profile/profile";
import "./ProfilePage.css";

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

    const [isGifting, setIsGifting] = useState(false);
    const [giftAmount, setGiftAmount] = useState("");
    const [giftLoading, setGiftLoading] = useState(false);
    const [giftMessage, setGiftMessage] = useState<{ text: string; isError: boolean } | null>(null);

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

    const handleGift = async () => {
        const amount = parseInt(giftAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            setGiftMessage({ text: "Введите корректную сумму", isError: true });
            return;
        }
        setGiftLoading(true);
        setGiftMessage(null);
        try {
            await giftStellaCoins(profile.username!, amount);
            setGiftMessage({ text: `Успешно переведено ${amount} Stellacoin!`, isError: false });
            setIsGifting(false);
            setGiftAmount("");
            await useAuthStore.getState().getUser();
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            setGiftMessage({ text: typeof detail === "string" ? detail : "Ошибка перевода", isError: true });
        } finally {
            setGiftLoading(false);
        }
    };

    return (
        <div className="profile-page">
            <header className="profile-hero">
                <Avatar url={profile.avatar_url} name={displayName} size={88} />
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
                    {profile.bio && <p className="profile-bio">{profile.bio}</p>}
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
                                className="profile-message-btn"
                                onClick={() => navigate(`/messages/${profile.username}`)}
                            >
                                Написать
                            </button>
                            
                            {!isGifting ? (
                                <button
                                    type="button"
                                    className="profile-message-btn"
                                    onClick={() => { setIsGifting(true); setGiftMessage(null); }}
                                >
                                    Подарить Stellacoin
                                </button>
                            ) : (
                                <div className="profile-gift-inline">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="profile-input profile-gift-input"
                                        placeholder="Сумма"
                                        value={giftAmount}
                                        onChange={(e) => setGiftAmount(e.target.value.replace(/\D/g, ""))}
                                        disabled={giftLoading}
                                    />
                                    <button
                                        type="button"
                                        className="profile-message-btn"
                                        onClick={handleGift}
                                        disabled={giftLoading}
                                    >
                                        {giftLoading ? "..." : "Отправить"}
                                    </button>
                                    <button
                                        type="button"
                                        className="profile-message-btn ghost"
                                        onClick={() => { setIsGifting(false); setGiftMessage(null); }}
                                        disabled={giftLoading}
                                    >
                                        Отмена
                                    </button>
                                </div>
                            )}
                            {giftMessage && (
                                <div className={`profile-gift-msg ${giftMessage.isError ? "error" : "success"}`}>
                                    {giftMessage.text}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <ProfileStatsRow
                stats={profile.stats}
                followers={followers}
                following={following}
                onOpenFollowers={() => profile.username && setFollowList("followers")}
                onOpenFollowing={() => profile.username && setFollowList("following")}
            />

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

            {followList && profile.username && (
                <FollowListModal
                    username={profile.username}
                    mode={followList}
                    onClose={() => setFollowList(null)}
                />
            )}
        </div>
    );
};
