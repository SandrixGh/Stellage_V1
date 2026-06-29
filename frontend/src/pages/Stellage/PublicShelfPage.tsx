import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useStellageStore } from "../../store/useStellageStore";
import { ShelfView } from "../../components/Stellage/ShelfView";
import "../Main/MainPage.css";

export const PublicShelfPage = () => {
    const { shelfId } = useParams<{ shelfId: string }>();
    const { publicShelf, fetchPublicShelf, isLoading, error } = useStellageStore();

    useEffect(() => {
        if (shelfId) {
            fetchPublicShelf(shelfId);
        }
    }, [shelfId, fetchPublicShelf]);

    if (isLoading) return <div className="status-info">Загрузка стеллажа...</div>;
    if (error) return <div className="status-info error">{error}</div>;
    if (!publicShelf) return <div className="status-info">Стеллаж не найден</div>;

    return (
        <section className="stellage-section">
            <header className="shelf-info">
                <div>
                    <h1 className="page-title">{publicShelf.title}</h1>
                    <p className="page-subtitle">
                        {publicShelf.owner_username
                            ? `Владелец: ${publicShelf.owner_username}`
                            : "Коллекция коробок"}
                    </p>
                </div>
                {publicShelf.is_public && <span className="badge">Публичная</span>}
            </header>

            <ShelfView shelf={publicShelf} editable={false} />
        </section>
    );
};
