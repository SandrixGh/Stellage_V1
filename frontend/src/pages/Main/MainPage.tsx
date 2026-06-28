import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { BoxCard } from "../../components/Stellage/BoxCard";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import "./MainPage.css";

export const MyStellagePage = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const { mainShelf, fetchMainShelf, isLoading, error } = useStellageStore();

    useEffect(() => {
        if (isAuthenticated) {
            fetchMainShelf();
        }
    }, [isAuthenticated, fetchMainShelf]);

    if (!isAuthenticated) {
        return (
            <div className="stellage-gate">
                <div className="stellage-gate-visual">
                    <WireframeBox size={280} />
                </div>
                <div className="stellage-gate-content">
                    <h1 className="stellage-gate-title">Мой стеллаж</h1>
                    <p className="stellage-gate-sub">
                        Войдите, чтобы увидеть свои полки и коробки.
                    </p>
                    <Link to="/login" className="gate-btn">Войти</Link>
                </div>
            </div>
        );
    }

    return (
        <section className="stellage-section">
            {isLoading && <div className="status-info">Загрузка коллекции...</div>}
            {error && <div className="status-info error">{error}</div>}

            {!isLoading && !error && (
                <>
                    <header className="shelf-info">
                        <div>
                            <h1 className="page-title">
                                {mainShelf?.title || "Твоя главная полка"}
                            </h1>
                            <p className="page-subtitle">Личная коллекция коробок</p>
                        </div>
                        {mainShelf?.is_public && <span className="badge">Публичная</span>}
                    </header>

                    <div className="boxes-grid">
                        {mainShelf?.boxes && mainShelf.boxes.length > 0 ? (
                            mainShelf.boxes.map((box) => (
                                <BoxCard key={box.id} box={box} />
                            ))
                        ) : (
                            <p className="empty-message">
                                Пока здесь пусто. Время добавить первую коробку!
                            </p>
                        )}
                    </div>
                </>
            )}
        </section>
    );
};
