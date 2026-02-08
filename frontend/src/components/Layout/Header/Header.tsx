import { useState } from "react";
import { useAuthStore } from "../../../store/useAuthStore"
import "./Header.css"
import { UserModal } from "./UserModal";
import { Logo } from "../../Logo/Logo";

export const Header = () => {
    const user = useAuthStore((state) => state.user);

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <header className="header">
            <div className="header-container">
                <a href="/" className="header-logo-wrapper">
                    <Logo className="header-logo-icon" size={28} />
                    <span className="header-logo-title">Stellage</span>
                </a>
                <nav className="header-nav">
                    <a href="/" className="nav-link active">Главная</a>
                    <a href="/shelves" className="nav-link">Стеллаж</a>
                </nav>

                <div className="header-actions">
                    <div className="user-profile" onClick={() => setIsModalOpen(!isModalOpen)}>
                        <span className="user-email">{user?.email || "Гость"}</span>
                        <button className="settings-btn" title="Настройки аккаунта">
                            <div className="settings-icon">⚙</div>
                        </button>
                    </div>

                    {isModalOpen && <UserModal onClose={() => setIsModalOpen(false)} />}
                </div>
            </div>
        </header>
    )
}