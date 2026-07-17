import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../store/useAuthStore";
import { useThemeStore } from "../../store/useThemeStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { Avatar } from "../../components/UI/Avatar";
import { AvatarCropper } from "../../components/Profile/AvatarCropper";
import { DeviceAccounts } from "../../components/Profile/DeviceAccounts";
import {
    AVATAR_MIME_TYPES,
    avatarErrorMessage,
    getMyProfile,
    uploadAvatar,
} from "../../api/profile";
import "../Profile/ProfilePage.css";
import "./SettingsPage.css";

export const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, logout, delete_account, updateProfile } = useAuthStore();
    const { theme, setTheme } = useThemeStore();

    const [username, setUsername] = useState(user?.username ?? "");
    const [nickname, setNickname] = useState(user?.nickname ?? "");
    const [bio, setBio] = useState(user?.bio ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    // Текущий аватар (presigned из /profile/me) + загрузка нового.
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    // Выбранный файл, который сейчас кадрируется (null — кроппер закрыт).
    const [cropFile, setCropFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isAuthenticated) return;
        getMyProfile()
            .then((p) => setAvatarUrl(p.avatar_url ?? null))
            .catch(() => setAvatarUrl(null));
    }, [isAuthenticated]);

    if (!isAuthenticated || !user) {
        return (
            <div className="profile-gate">
                <div className="profile-gate-visual">
                    <WireframeBox size={240} />
                </div>
                <div className="profile-gate-content">
                    <h1 className="profile-gate-title">Настройки</h1>
                    <p className="profile-gate-sub">
                        Войдите в аккаунт, чтобы изменить настройки.
                    </p>
                    <Link to="/login" className="profile-gate-btn">Войти</Link>
                    <div className="theme-toggle-standalone">
                        <ThemeToggle theme={theme} onChange={setTheme} />
                    </div>
                </div>
            </div>
        );
    }

    // Выбор файла открывает кадрирование, а не грузит сразу.
    const handleAvatarPick = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // позволяем выбрать тот же файл повторно
        if (!file || avatarBusy) return;
        setAvatarError(null);
        setCropFile(file);
    };

    // Обрезанный квадрат из кроппера — грузим его.
    const handleCropped = async (cropped: File) => {
        setCropFile(null);
        setAvatarBusy(true);
        try {
            await uploadAvatar(cropped);
            const p = await getMyProfile();
            setAvatarUrl(p.avatar_url ?? null);
        } catch (err) {
            setAvatarError(avatarErrorMessage(err));
        } finally {
            setAvatarBusy(false);
        }
    };

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
                bio: bio.trim() || undefined,
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
                <div className="settings-avatar-wrap">
                    <Avatar url={avatarUrl} name={nickname.trim() || user.email} size={88} />
                    <button
                        type="button"
                        className="settings-avatar-edit"
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarBusy}
                    >
                        {avatarBusy ? "…" : "Сменить"}
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept={AVATAR_MIME_TYPES.join(",")}
                        hidden
                        onChange={handleAvatarPick}
                    />
                </div>
                <div className="profile-identity">
                    <p className="profile-eyebrow">Аккаунт</p>
                    <h1 className="profile-email">Настройки</h1>
                    <p className="profile-subline">{user.email}</p>
                    {avatarError && <p className="profile-form-error">{avatarError}</p>}
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

                        <label className="profile-field">
                            <span className="profile-field-label">О себе</span>
                            <textarea
                                className="profile-input profile-textarea"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Пара слов о себе или о вашей коллекции"
                                maxLength={280}
                                rows={3}
                            />
                            <span className="profile-field-hint">{bio.length}/280</span>
                        </label>

                        {error && <p className="profile-form-error">{error}</p>}
                        {saved && !error && <p className="profile-form-ok">Профиль сохранён.</p>}

                        <button className="profile-link-btn" type="submit" disabled={saving}>
                            {saving ? "Сохранение…" : "Сохранить"}
                        </button>
                    </form>
                </section>

                <section className="profile-card">
                    <h2 className="profile-card-title">Оформление</h2>
                    <div className="profile-row">
                        <div className="profile-row-text">
                            <span className="profile-row-label">Тема</span>
                            <span className="profile-row-value">
                                {theme === "light" ? "Светлая (бумага)" : "Тёмная"}
                            </span>
                        </div>
                        <ThemeToggle theme={theme} onChange={setTheme} />
                    </div>
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

                <DeviceAccounts />

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

            {cropFile && (
                <AvatarCropper
                    file={cropFile}
                    onCancel={() => setCropFile(null)}
                    onCrop={handleCropped}
                />
            )}
        </div>
    );
};

const ThemeToggle = ({
    theme,
    onChange,
}: {
    theme: "light" | "dark";
    onChange: (theme: "light" | "dark") => void;
}) => (
    <div className="theme-toggle" role="radiogroup" aria-label="Тема оформления">
        <button
            type="button"
            role="radio"
            aria-checked={theme === "light"}
            className={`theme-toggle-option${theme === "light" ? " active" : ""}`}
            onClick={() => onChange("light")}
        >
            Светлая
        </button>
        <button
            type="button"
            role="radio"
            aria-checked={theme === "dark"}
            className={`theme-toggle-option${theme === "dark" ? " active" : ""}`}
            onClick={() => onChange("dark")}
        >
            Тёмная
        </button>
    </div>
);
