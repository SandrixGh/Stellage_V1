import { useEffect } from "react";
import { Header } from "../../components/Layout/Header/Header";
import { useStellageStore } from "../../store/useStellageStore";
// Импортируем компонент карточки, когда его создашь
// import { BoxCard } from "../../components/Stellage/BoxCard"; 
import "./MainPage.css";

export const MainPage = () => {
    // Достаем всё необходимое из стора
    const { mainShelf, fetchMainShelf, isLoading, error } = useStellageStore();

    // Запрашиваем данные при первом рендере
    useEffect(() => {
        fetchMainShelf();
    }, [fetchMainShelf]);

    return (
        <div className="main-page">
            <Header />
            <main className="main-content">
                {/* Обработка состояний загрузки и ошибки */}
                {isLoading && <div className="status-info">Загрузка коллекции...</div>}
                {error && <div className="status-info error">{error}</div>}

                {!isLoading && !error && (
                    <section className="stellage-section">
                        <header className="shelf-info">
                            <h1 className="shelf-title">
                                {mainShelf?.title || "Твоя главная полка"}
                            </h1>
                            {mainShelf?.is_public && <span className="badge">Публичная</span>}
                        </header>

                        <div className="boxes-grid">
                            {mainShelf?.boxes && mainShelf.boxes.length > 0 ? (
                                mainShelf.boxes.map((box) => (
                                    <div key={box.id} className="box-wrapper">
                                        {/* Пока нет BoxCard, выведем просто название */}
                                        <div className="box-placeholder">
                                            {box.template.title}
                                            <span className="serial">#{box.serial_number}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-message">Пока здесь пусто. Время добавить первую коробку!</p>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};