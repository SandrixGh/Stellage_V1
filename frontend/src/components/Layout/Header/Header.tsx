import { useAuthStore } from "../../../store/useAuthStore"
import "./Header.css"

export const Header = () => {
    const user = useAuthStore((state) => state.user);

    return (
        <header className="header">
            <div className="header-container">
                <a href="/" className="header-logo">Stellage</a>

                <nav className="header-nav">
                    <a href="/" className="nav-link active">Главная</a>
                    <a href="/shelves" className="nav-link">Стеллаж</a>
                </nav>

                <div className="header-actions">
                    <div className="user-profile">
                        <span className="user-email">{user?.email || "Гость"}</span>
                        <button className="settings-btn" title="Настройки аккаунта">
                            <div className="settings-icon">⚙</div>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}