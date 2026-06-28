import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import "./ProfilePage.css";

export const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, logout, delete_account } = useAuthStore();

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

    const monogram = user.email?.trim()?.[0]?.toUpperCase() ?? "S";
    const shortId = user.id ? `${user.id.slice(0, 8)}…` : "—";

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

    return (
        <div className="profile-page">
            <header className="profile-hero">
                <div className="profile-avatar" aria-hidden="true">
                    <span>{monogram}</span>
                </div>
                <div className="profile-identity">
                    <p className="profile-eyebrow">Аккаунт</p>
                    <h1 className="profile-email">{user.email}</h1>
                    <div className="profile-meta">
                        <span className="profile-chip profile-chip-id">ID&nbsp;·&nbsp;{shortId}</span>
                        <span className="profile-chip profile-chip-status">Активен</span>
                    </div>
                </div>
            </header>

            <div className="profile-layout">
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
