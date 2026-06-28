import { Link } from "react-router-dom";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import "./HomePage.css";

const FEATURES = [
    {
        num: "01",
        title: "Коробки",
        text: "Контейнеры с цифровым контентом — фото, видео, тексты, приложения и скрипты.",
    },
    {
        num: "02",
        title: "Стеллажи",
        text: "Личное пространство, где вы собираете, выставляете и коллекционируете коробки.",
    },
    {
        num: "03",
        title: "Лента",
        text: "Витрина всех доступных коробок платформы — находите редкие и ценные экземпляры.",
    },
];

export const HomePage = () => {
    return (
        <div className="home-page">
            <section className="home-hero">
                <div className="home-hero-text-col">
                    <p className="home-hero-label">Stellage / 2025</p>
                    <h1 className="home-hero-title">
                        Площадка<br />
                        <span className="home-hero-dim">для контента</span>
                    </h1>
                    <p className="home-hero-body">
                        Покупайте, продавайте и коллекционируйте коробки
                        с цифровым контентом на собственных стеллажах.
                    </p>
                    <div className="home-hero-actions">
                        <Link to="/feed" className="home-btn primary">Открыть Ленту</Link>
                        <Link to="/my-stellage" className="home-btn ghost">Мой стеллаж</Link>
                    </div>
                </div>

                <div className="home-hero-visual">
                    <WireframeBox size={420} />
                </div>
            </section>

            <div className="home-divider" />

            <section className="home-features">
                {FEATURES.map((f) => (
                    <div key={f.num} className="feature-row">
                        <span className="feature-num">{f.num}</span>
                        <div className="feature-body">
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-text">{f.text}</p>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
};
