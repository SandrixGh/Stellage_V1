import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ShelfView } from "../../components/Stellage/ShelfView";
import "./MainPage.css";

export const MyStellagePage = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const { mainShelf, fetchMainShelf, updateBoxPosition, createShelf, isLoading } =
        useStellageStore();

    // Модалка создания нового стеллажа.
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newPublic, setNewPublic] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        const title = newTitle.trim();
        if (title.length < 3 || isCreating) return;
        setIsCreating(true);
        const shelf = await createShelf(title, newPublic);
        setIsCreating(false);
        if (shelf) {
            setIsCreateOpen(false);
            setNewTitle("");
            setNewPublic(true);
            // Детальная страница доступна только для публичных полок.
            if (shelf.is_public) {
                navigate(`/stellage/${shelf.id}`);
            }
        }
    };

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

            {!isLoading && (
                <>
                    <header className="shelf-info">
                        <div>
                            <h1 className="page-title">
                                {mainShelf?.title || "Твоя главная полка"}
                            </h1>
                            <p className="page-subtitle">Личная коллекция коробок</p>
                        </div>
                        <div className="shelf-info-actions">
                            {mainShelf?.is_public && <span className="badge">Публичная</span>}
                            <button
                                type="button"
                                className="create-shelf-btn"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                + Создать стеллаж
                            </button>
                        </div>
                    </header>

                    {mainShelf ? (
                        <ShelfView shelf={mainShelf} editable onMove={updateBoxPosition} />
                    ) : (
                        <div className="shelf-empty-state">
                            <p>У тебя пока нет стеллажа. Создай первый!</p>
                        </div>
                    )}
                </>
            )}

            {isCreateOpen && (
                <div
                    className="shelf-modal-overlay"
                    onClick={() => !isCreating && setIsCreateOpen(false)}
                >
                    <div
                        className="shelf-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="shelf-modal-title">Новый стеллаж</h2>
                        <input
                            type="text"
                            className="shelf-modal-input"
                            placeholder="Название стеллажа"
                            value={newTitle}
                            maxLength={100}
                            autoFocus
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        />
                        <label className="shelf-modal-check">
                            <input
                                type="checkbox"
                                checked={newPublic}
                                onChange={(e) => setNewPublic(e.target.checked)}
                            />
                            Публичный стеллаж
                        </label>
                        <div className="shelf-modal-actions">
                            <button
                                type="button"
                                className="shelf-modal-btn ghost"
                                onClick={() => setIsCreateOpen(false)}
                                disabled={isCreating}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="shelf-modal-btn primary"
                                onClick={handleCreate}
                                disabled={isCreating || newTitle.trim().length < 3}
                            >
                                {isCreating ? "Создание…" : "Создать"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
