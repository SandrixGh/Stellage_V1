import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../store/useAuthStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { onlineStatus, isOnline } from "../../utils/onlineStatus";
import "./ProfilePage.css";

export const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, logout, delete_account, updateProfile } = useAuthStore();

    const [username, setUsername] = useState(user?.username ?? "");
    const [nickname, setNickname] = useState(user?.nickname ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    if (!isAuthenticated || !user) {
        return (
            <div className="profile-gate">
                <div className="profile-gate-visual">
                    <WireframeBox size={240} />
                </div>
                <div className="profile-gate-content">
                    <h1 className="profile-gate-title">Профиль</h1>
                    <p className="profile-gate-sub">
                        Войдите в аккаунт, чтобы управлять профилем и стеллажами.
                    </p>
                    <Link to="/login" className="profile-gate-btn">Войти</Link>
                </div>
            </div>
        );
    }

    const displayName = user.nickname?.trim() || user.email;
    const monogram = displayName?.trim()?.[0]?.toUpperCase() ?? "S";
    const online = isOnline(user.last_seen_at);

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    const handleDelete = async () => {
        if (window.confirm("Удалить аккаунт навсегда? Это действие необратимо.")) {
            await delete_account();
            navigate("/");
        }
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        setSaving(true);
        try {
            await updateProfile({
                username: username.trim() || undefined,
                nickname: nickname.trim() || undefined,
            });
            setSaved(true);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setError("Этот username уже занят. Выберите другой.");
            } else {
                setError("Не удалось сохранить профиль. Попробуйте позже.");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="profile-page">
            <header className="profile-hero">
                <div className="profile-avatar" aria-hidden="true">
                    <span>{monogram}</span>
                </div>
                <div className="profile-identity">
                    <p className="profile-eyebrow">Аккаунт</p>
                    <h1 className="profile-email">{displayName}</h1>
                    {user.nickname?.trim() && (
                        <p className="profile-subline">{user.email}</p>
                    )}
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

            <div className="profile-layout">
                <section className="profile-card">
                    <h2 className="profile-card-title">Профиль</h2>
                    <form className="profile-form" onSubmit={handleSave}>
                        <label className="profile-field">
                            <span className="profile-field-label">Username</span>
                            <div className="profile-input-wrap">
                                <span className="profile-input-prefix">@</span>
                                <input
                                    className="profile-input profile-input-prefixed"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                    placeholder="username"
                                    pattern="[a-z0-9_]+"
                                    minLength={3}
                                    maxLength={30}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                            </div>
                            <span className="profile-field-hint">Латиница в нижнем регистре, цифры и _</span>
                        </label>

                        <label className="profile-field">
                            <span className="profile-field-label">Никнейм</span>
                            <input
                                className="profile-input"
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="Отображаемое имя"
                                maxLength={50}
                            />
                        </label>

                        {error && <p className="profile-form-error">{error}</p>}
                        {saved && !error && <p className="profile-form-ok">Профиль сохранён.</p>}

                        <button className="profile-link-btn" type="submit" disabled={saving}>
                            {saving ? "Сохранение…" : "Сохранить"}
                        </button>
                    </form>
                </section>

                <section className="profile-card">
                    <h2 className="profile-card-title">Безопасность</h2>

                    <div className="profile-row">
                        <div className="profile-row-text">
                            <span className="profile-row-label">Электронная почта</span>
                            <span className="profile-row-value">{user.email}</span>
                        </div>
                        <button className="profile-row-action" disabled>Скоро</button>
                    </div>

                    <div className="profile-row">
                        <div className="profile-row-text">
                            <span className="profile-row-label">Пароль</span>
                            <span className="profile-row-value">••••••••</span>
                        </div>
                        <button className="profile-row-action" disabled>Скоро</button>
                    </div>
                </section>

                <section className="profile-card">
                    <h2 className="profile-card-title">Коллекция</h2>
                    <p className="profile-card-text">
                        Ваши полки и коробки собраны на личном стеллаже.
                    </p>
                    <Link to="/my-stellage" className="profile-link-btn">
                        Открыть мой стеллаж
                    </Link>
                </section>

                <section className="profile-card profile-card-danger">
                    <h2 className="profile-card-title">Сессия и аккаунт</h2>
                    <div className="profile-danger-actions">
                        <button className="profile-btn ghost" onClick={handleLogout}>
                            Выйти из аккаунта
                        </button>
                        <button className="profile-btn danger" onClick={handleDelete}>
                            Удалить аккаунт
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};
