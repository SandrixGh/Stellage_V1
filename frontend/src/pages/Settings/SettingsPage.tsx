import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../store/useAuthStore";
import { useThemeStore } from "../../store/useThemeStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { Avatar } from "../../components/UI/Avatar";
import { AvatarCropper } from "../../components/Profile/AvatarCropper";
import { BannerEditorModal } from "../../components/Profile/BannerEditorModal";
import { DeviceAccounts } from "../../components/Profile/DeviceAccounts";
import {
    AVATAR_MIME_TYPES,
    avatarErrorMessage,
    getMyProfile,
    uploadAvatar,
} from "../../api/profile";
import { changePassword } from "../../api/sessions";
import "./SettingsPage.css";

type SettingsTab = "profile" | "security" | "appearance" | "sessions" | "danger";

export const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, logout, delete_account, updateProfile } = useAuthStore();
    const { theme, setTheme } = useThemeStore();

    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

    // ----- ПРОФИЛЬ STATE -----
    const [username, setUsername] = useState(user?.username ?? "");
    const [nickname, setNickname] = useState(user?.nickname ?? "");
    const [bio, setBio] = useState(user?.bio ?? "");
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSaved, setProfileSaved] = useState(false);

    // Аватар & Обложка
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [bannerPosY, setBannerPosY] = useState<number>(50);
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);

    // ----- СМЕНА ПАРОЛЯ STATE -----
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // ----- ЗВУКИ STATE -----
    const [soundEnabled, setSoundEnabled] = useState(() => {
        return localStorage.getItem("stellage-sound-fx") !== "disabled";
    });

    // ----- МОДАЛКА УДАЛЕНИЯ -----
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);

    const loadProfileData = async () => {
        try {
            const p = await getMyProfile();
            setAvatarUrl(p.avatar_url ?? null);
            setBannerUrl(p.banner_url ?? null);
            setBannerPosY(p.banner_pos_y ?? 50);
            if (p.bio !== undefined && p.bio !== null) setBio(p.bio);
            if (p.username) setUsername(p.username);
            if (p.nickname) setNickname(p.nickname);
        } catch {
            setAvatarUrl(null);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        loadProfileData();
    }, [isAuthenticated]);

    if (!isAuthenticated || !user) {
        return (
            <div className="settings-gate-container">
                <div className="profile-gate">
                    <div className="profile-gate-visual">
                        <WireframeBox size={200} />
                    </div>
                    <div className="profile-gate-content">
                        <h1 className="profile-gate-title">Настройки</h1>
                        <p className="profile-gate-sub">
                            Пожалуйста, войдите в аккаунт, чтобы изменить настройки.
                        </p>
                        <Link to="/login" className="profile-gate-btn">Войти в аккаунт</Link>
                    </div>
                </div>
            </div>
        );
    }

    // Обработка смены аватара
    const handleAvatarPick = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || avatarBusy) return;
        setAvatarError(null);
        setCropFile(file);
    };

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

    // Сохранение профиля
    const handleSaveProfile = async (e: FormEvent) => {
        e.preventDefault();
        setProfileError(null);
        setProfileSaved(false);

        const trimmedUsername = username.trim();
        if (trimmedUsername && !/^[a-z0-9_]{3,30}$/.test(trimmedUsername)) {
            setProfileError(
                "Username: 3–30 символов, только строчные латинские буквы, цифры и _",
            );
            return;
        }

        setSavingProfile(true);
        try {
            await updateProfile({
                username: trimmedUsername || undefined,
                nickname: nickname.trim() || undefined,
                bio: bio.trim() || undefined,
            });
            setProfileSaved(true);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setProfileError("Этот username уже занят. Выберите другой.");
            } else {
                setProfileError("Не удалось сохранить профиль. Попробуйте позже.");
            }
        } finally {
            setSavingProfile(false);
        }
    };

    // Сохранение пароля
    const handleSavePassword = async (e: FormEvent) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);

        if (!currentPassword) {
            setPasswordError("Введите текущий пароль");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("Новый пароль должен содержать не менее 8 символов");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Пароли не совпадают");
            return;
        }

        setSavingPassword(true);
        try {
            await changePassword({
                current_password: currentPassword,
                new_password: newPassword,
            });
            setPasswordSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.data?.detail) {
                setPasswordError(err.response.data.detail);
            } else {
                setPasswordError("Не удалось изменить пароль. Проверьте текущий пароль.");
            }
        } finally {
            setSavingPassword(false);
        }
    };

    // Переключение звуков
    const handleToggleSound = (enabled: boolean) => {
        setSoundEnabled(enabled);
        localStorage.setItem("stellage-sound-fx", enabled ? "enabled" : "disabled");
    };

    // Выход и удаление
    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirmText.toLowerCase() !== "удалить") return;
        setDeleting(true);
        try {
            await delete_account();
            navigate("/");
        } finally {
            setDeleting(false);
        }
    };

    const displayName = nickname.trim() || user.username || user.email;

    return (
        <div className="settings-page">
            <header className="settings-header">
                <div className="settings-header-content">
                    <h1 className="settings-title">Настройки</h1>
                </div>
            </header>

            <div className="settings-container">
                {/* СИДЕБАР НАВИГАЦИИ ПО НАСТРОЙКАМ */}
                <aside className="settings-sidebar" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "profile"}
                        className={`settings-nav-btn${activeTab === "profile" ? " active" : ""}`}
                        onClick={() => setActiveTab("profile")}
                    >
                        <span className="settings-nav-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </span>
                        <span>Профиль</span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "security"}
                        className={`settings-nav-btn${activeTab === "security" ? " active" : ""}`}
                        onClick={() => setActiveTab("security")}
                    >
                        <span className="settings-nav-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </span>
                        <span>Безопасность</span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "appearance"}
                        className={`settings-nav-btn${activeTab === "appearance" ? " active" : ""}`}
                        onClick={() => setActiveTab("appearance")}
                    >
                        <span className="settings-nav-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2" strokeWidth="2" />
                                <path d="M12 20v2" strokeWidth="2" />
                                <path d="m4.93 4.93 1.41 1.41" strokeWidth="2" />
                                <path d="m17.66 17.66 1.41 1.41" strokeWidth="2" />
                                <path d="M2 12h2" strokeWidth="2" />
                                <path d="M20 12h2" strokeWidth="2" />
                                <path d="m6.34 17.66-1.41 1.41" strokeWidth="2" />
                                <path d="m19.07 4.93-1.41 1.41" strokeWidth="2" />
                            </svg>
                        </span>
                        <span>Интерфейс и Звуки</span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "sessions"}
                        className={`settings-nav-btn${activeTab === "sessions" ? " active" : ""}`}
                        onClick={() => setActiveTab("sessions")}
                    >
                        <span className="settings-nav-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="12" x="3" y="4" rx="2" />
                                <line x1="2" x2="22" y1="20" y2="20" />
                            </svg>
                        </span>
                        <span>Устройства</span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "danger"}
                        className={`settings-nav-btn settings-nav-btn-danger${activeTab === "danger" ? " active" : ""}`}
                        onClick={() => setActiveTab("danger")}
                    >
                        <span className="settings-nav-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </span>
                        <span>Опасная зона</span>
                    </button>
                </aside>

                {/* ОСНОВНОЙ КОНТЕНТ ВКЛАДКИ */}
                <main className="settings-main">
                    {/* ТАБ 1: ПРОФИЛЬ */}
                    {activeTab === "profile" && (
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title">Публичный профиль</h2>
                                <p className="settings-card-sub">Информация, которую видят другие коллекционеры</p>
                            </div>

                            <div className="settings-avatar-section">
                                <Avatar url={avatarUrl} name={displayName} size={84} />
                                <div className="settings-avatar-controls">
                                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                        <button
                                            type="button"
                                            className="settings-btn secondary"
                                            onClick={() => fileRef.current?.click()}
                                            disabled={avatarBusy}
                                        >
                                            {avatarBusy ? "Загрузка…" : "Сменить аватар"}
                                        </button>
                                        <button
                                            type="button"
                                            className="settings-btn secondary"
                                            onClick={() => setIsBannerModalOpen(true)}
                                        >
                                            Настроить обложку
                                        </button>
                                    </div>
                                    <span className="settings-field-hint">Рекомендуется изображение JPG, PNG или WebP</span>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept={AVATAR_MIME_TYPES.join(",")}
                                        hidden
                                        onChange={handleAvatarPick}
                                    />
                                    {avatarError && <p className="settings-error-msg">{avatarError}</p>}
                                </div>
                            </div>

                            <form className="settings-form" onSubmit={handleSaveProfile}>
                                <div className="settings-field">
                                    <label className="settings-label" htmlFor="settings-username">Username</label>
                                    <div className="settings-input-prefix-wrap">
                                        <span className="settings-input-prefix">@</span>
                                        <input
                                            id="settings-username"
                                            className="settings-input settings-input-prefixed"
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
                                    <span className="settings-field-hint">Уникальный идентификатор: 3–30 символов (a-z, 0-9, _)</span>
                                </div>

                                <div className="settings-field">
                                    <label className="settings-label" htmlFor="settings-nickname">Никнейм</label>
                                    <input
                                        id="settings-nickname"
                                        className="settings-input"
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="Ваше имя на платформе"
                                        maxLength={50}
                                    />
                                </div>

                                <div className="settings-field">
                                    <label className="settings-label" htmlFor="settings-bio">О себе</label>
                                    <textarea
                                        id="settings-bio"
                                        className="settings-input settings-textarea"
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Расскажите пару слов о вашей коллекции или интересах"
                                        maxLength={280}
                                        rows={3}
                                    />
                                    <span className="settings-field-hint-right">{bio.length}/280</span>
                                </div>

                                {profileError && <div className="settings-error-alert">{profileError}</div>}
                                {profileSaved && !profileError && <div className="settings-success-alert">Изменения профиля успешно сохранены.</div>}

                                <div className="settings-form-actions">
                                    <button className="settings-btn primary" type="submit" disabled={savingProfile}>
                                        {savingProfile ? "Сохранение…" : "Сохранить профиль"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ТАБ 2: БЕЗОПАСНОСТЬ */}
                    {activeTab === "security" && (
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title">Безопасность и Вход</h2>
                                <p className="settings-card-sub">Управление паролем и авторизацией</p>
                            </div>

                            <div className="settings-field-box">
                                <div className="settings-field-box-text">
                                    <span className="settings-label">Электронная почта</span>
                                    <span className="settings-value-highlight">{user.email}</span>
                                </div>
                                <span className="settings-badge verified">Подтверждён</span>
                            </div>

                            <div className="settings-divider" />

                            <h3 className="settings-section-subtitle">Смена пароля</h3>
                            <form className="settings-form" onSubmit={handleSavePassword}>
                                <div className="settings-field">
                                    <label className="settings-label" htmlFor="current-pass">Текущий пароль</label>
                                    <input
                                        id="current-pass"
                                        className="settings-input"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="settings-field">
                                    <label className="settings-label" htmlFor="new-pass">Новый пароль</label>
                                    <input
                                        id="new-pass"
                                        className="settings-input"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Не менее 8 символов"
                                        minLength={8}
                                    />
                                </div>

                                <div className="settings-field">
                                    <label className="settings-label" htmlFor="confirm-pass">Подтверждение нового пароля</label>
                                    <input
                                        id="confirm-pass"
                                        className="settings-input"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Повторите новый пароль"
                                        minLength={8}
                                    />
                                </div>

                                {passwordError && <div className="settings-error-alert">{passwordError}</div>}
                                {passwordSuccess && <div className="settings-success-alert">Пароль успешно изменён!</div>}

                                <div className="settings-form-actions">
                                    <button className="settings-btn primary" type="submit" disabled={savingPassword}>
                                        {savingPassword ? "Обновление…" : "Обновить пароль"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ТАБ 3: ВНЕШНИЙ ВИД И ЗВУКИ */}
                    {activeTab === "appearance" && (
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title">Интерфейс и Звуки</h2>
                                <p className="settings-card-sub">Настройка темы приложения и аудио-эффектов</p>
                            </div>

                            <div className="settings-row-item">
                                <div className="settings-row-info">
                                    <span className="settings-row-title">Тема оформления</span>
                                    <span className="settings-row-desc">
                                        {theme === "light" ? "Светлая тема (бумажный стиль)" : "Тёмная тема (Stellage Obsidian)"}
                                    </span>
                                </div>
                                <div className="theme-toggle-group" role="radiogroup">
                                    <button
                                        type="button"
                                        className={`theme-opt-btn${theme === "light" ? " active" : ""}`}
                                        onClick={() => setTheme("light")}
                                    >
                                        Светлая
                                    </button>
                                    <button
                                        type="button"
                                        className={`theme-opt-btn${theme === "dark" ? " active" : ""}`}
                                        onClick={() => setTheme("dark")}
                                    >
                                        Тёмная
                                    </button>
                                </div>
                            </div>

                            <div className="settings-divider" />

                            <div className="settings-row-item">
                                <div className="settings-row-info">
                                    <span className="settings-row-title">Звуковые эффекты</span>
                                    <span className="settings-row-desc">Звуки при распаковке коробок и взаимодействии со стеллажом</span>
                                </div>
                                <label className="settings-switch">
                                    <input
                                        type="checkbox"
                                        checked={soundEnabled}
                                        onChange={(e) => handleToggleSound(e.target.checked)}
                                    />
                                    <span className="settings-slider" />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ТАБ 4: УСТРОЙСТВА */}
                    {activeTab === "sessions" && (
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title">Аккаунты на этом устройстве</h2>
                                <p className="settings-card-sub">Управление сохранёнными сессиями для быстрого переключения</p>
                            </div>
                            <DeviceAccounts />
                        </div>
                    )}

                    {/* ТАБ 5: ОПАСНАЯ ЗОНА */}
                    {activeTab === "danger" && (
                        <div className="settings-card settings-card-danger">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title danger-text">Опасная зона</h2>
                                <p className="settings-card-sub">Выход из системы или бессрочное удаление аккаунта</p>
                            </div>

                            <div className="settings-row-item">
                                <div className="settings-row-info">
                                    <span className="settings-row-title">Выйти из системы</span>
                                    <span className="settings-row-desc">Завершить текущую сессию на этом устройстве</span>
                                </div>
                                <button type="button" className="settings-btn secondary" onClick={handleLogout}>
                                    Выйти
                                </button>
                            </div>

                            <div className="settings-divider" />

                            <div className="settings-row-item">
                                <div className="settings-row-info">
                                    <span className="settings-row-title danger-text">Удалить аккаунт навсегда</span>
                                    <span className="settings-row-desc">Все данные, коробки и история коллекции будут безвозвратно удалены</span>
                                </div>
                                <button
                                    type="button"
                                    className="settings-btn danger"
                                    onClick={() => setShowDeleteModal(true)}
                                >
                                    Удалить аккаунт
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* КРОППЕР АВАТАРА */}
            {cropFile && (
                <AvatarCropper
                    file={cropFile}
                    onCancel={() => setCropFile(null)}
                    onCrop={handleCropped}
                />
            )}

            {/* МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ */}
            {showDeleteModal && (
                <div className="settings-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3 className="settings-modal-title">Вы уверены?</h3>
                        <p className="settings-modal-desc">
                            Это действие <strong>невозможно отменить</strong>. Аккаунт <strong>{user.email}</strong> будет полностью удалён.
                        </p>
                        <p className="settings-modal-subdesc">
                            Чтобы подтвердить удаление, введите слово <strong>удалить</strong> ниже:
                        </p>
                        <input
                            type="text"
                            className="settings-input"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="удалить"
                            autoFocus
                        />
                        <div className="settings-modal-actions">
                            <button
                                type="button"
                                className="settings-btn secondary"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText("");
                                }}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="settings-btn danger"
                                disabled={deleteConfirmText.toLowerCase() !== "удалить" || deleting}
                                onClick={handleConfirmDelete}
                            >
                                {deleting ? "Удаление…" : "Подтвердить удаление"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ОБЛОЖКИ */}
            {isBannerModalOpen && (
                <BannerEditorModal
                    isOpen={isBannerModalOpen}
                    onClose={() => setIsBannerModalOpen(false)}
                    currentBannerUrl={bannerUrl}
                    currentBannerPosY={bannerPosY}
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    onSuccess={() => {
                        loadProfileData();
                        setProfileSaved(true);
                    }}
                />
            )}
        </div>
    );
};
