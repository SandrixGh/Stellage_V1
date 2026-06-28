import { Link } from "react-router-dom";
import "./HomePage.css";

const FEATURES = [
    {
        icon: "📦",
        title: "Коробки",
        text: "Контейнеры с цифровым контентом — фото, видео, тексты, приложения и скрипты.",
    },
    {
        icon: "🗄️",
        title: "Стеллажи",
        text: "Личное пространство, где вы собираете, выставляете и коллекционируете коробки.",
    },
    {
        icon: "✨",
        title: "Лента",
        text: "Витрина всех доступных коробок платформы — находите редкие и ценные экземпляры.",
    },
];

export const HomePage = () => {
    return (
        <div className="home-page">
            <section className="home-hero">
                <h1 className="home-hero-title">
                    Площадка цифрового
                    <br />
                    <span className="home-hero-accent">контента</span>
                </h1>
                <p className="home-hero-text">
                    Покупайте, продавайте, размещайте и коллекционируйте коробки
                    с цифровым контентом на собственных стеллажах.
                </p>
                <div className="home-hero-actions">
                    <Link to="/feed" className="home-btn primary">Открыть Ленту</Link>
                    <Link to="/my-stellage" className="home-btn ghost">Мой стеллаж</Link>
                </div>
            </section>

            <section className="home-features">
                {FEATURES.map((f) => (
                    <div key={f.title} className="feature-card">
                        <div className="feature-icon">{f.icon}</div>
                        <h3 className="feature-title">{f.title}</h3>
                        <p className="feature-text">{f.text}</p>
                    </div>
                ))}
            </section>
        </div>
    );
};
