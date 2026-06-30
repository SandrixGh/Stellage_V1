import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useStellageStore } from "../../store/useStellageStore";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { BoxDetailModal } from "../Box/BoxDetailModal";
import type { Box } from "../../types/Stellage/boxes";
import "../Main/MainPage.css";

export const PublicShelfPage = () => {
    const { shelfId } = useParams<{ shelfId: string }>();
    const { publicShelf, fetchPublicShelf, isLoading, error } = useStellageStore();
    const [openedBox, setOpenedBox] = useState<Box | null>(null);

    useEffect(() => {
        if (shelfId) {
            fetchPublicShelf(shelfId);
        }
    }, [shelfId, fetchPublicShelf]);

    return (
        <section className="stellage-section">
            {isLoading && <div className="status-info">Загрузка стеллажа...</div>}
            {error && <div className="status-info error">{error}</div>}

            {!isLoading && !error && (
                <>
                    <header className="shelf-info shelf-info--compact">
                        <div className="shelf-info-left">
                            <h1 className="page-title page-title--compact">
                                {publicShelf?.owner_username
                                    ? `Стеллаж @${publicShelf.owner_username}`
                                    : "Публичный стеллаж"}
                            </h1>
                        </div>
                    </header>

                    {/* Публичный просмотр — перетаскивание отключено, но коробку
                        можно открыть по клику. */}
                    <ShelfView shelf={publicShelf} editable={false} onOpen={setOpenedBox} />
                </>
            )}

            <BoxDetailModal box={openedBox} onClose={() => setOpenedBox(null)} />
        </section>
    );
};
