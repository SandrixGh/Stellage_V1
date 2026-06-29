import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { TemplateCard } from "../../components/Stellage/TemplateCard";
import { useStellageStore } from "../../store/useStellageStore";
import { MOCK_TEMPLATES } from "../../data/mockTemplates";
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
    const navigate = useNavigate();
    const { templates, fetchTemplates } = useStellageStore();

    useEffect(() => {
        if (templates.length === 0) fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const source = templates.length > 0 ? templates : MOCK_TEMPLATES;
    const teaser = source.slice(0, 4);

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
                    <WireframeBox size={400} />
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

            <section className="home-teaser">
                <div className="home-teaser-head">
                    <h2 className="home-teaser-title">В ленте сейчас</h2>
                    <Link to="/feed" className="home-teaser-link">
                        Открыть Ленту →
                    </Link>
                </div>
                <div className="home-teaser-grid">
                    {teaser.map((tpl) => (
                        <TemplateCard
                            key={tpl.id}
                            template={tpl}
                            size={180}
                            onClick={() => navigate(`/box/${tpl.id}`)}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};
