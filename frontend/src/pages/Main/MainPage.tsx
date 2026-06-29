import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { placeBoxes } from "../../components/Stellage/ShelfBoard";
import "./MainPage.css";

export const MyStellagePage = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const {
        shelves,
        mainShelf,
        selectedShelf,
        fetchShelves,
        fetchMainShelf,
        fetchShelfWithBoxes,
        updateBoxPosition,
        createShelf,
        instances,
        fetchInstances,
        moveBox,
        isLoading,
    } = useStellageStore();

    // id выбранной во переключателе полки (null = главная).
    const [activeShelfId, setActiveShelfId] = useState<string | null>(null);

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
            fetchShelves();
            fetchMainShelf();
            fetchInstances();
        }
    }, [isAuthenticated, fetchShelves, fetchMainShelf, fetchInstances]);

    // Полка, активная сейчас на доске: главная либо выбранная в переключателе.
    const currentShelf =
        activeShelfId && activeShelfId !== mainShelf?.id ? selectedShelf : mainShelf;

    const handleSelectShelf = (shelfId: string) => {
        if (shelfId === mainShelf?.id) {
            setActiveShelfId(null);
        } else {
            setActiveShelfId(shelfId);
            fetchShelfWithBoxes(shelfId);
        }
    };

    // Коробки в инвентаре — ещё не поставленные на полку.
    const trayBoxes = instances.filter((b) => b.shelf_id === null);

    const handlePlaceOnShelf = async (instanceId: string) => {
        if (!currentShelf) return;
        const targetShelfId = currentShelf.id;
        await moveBox(instanceId, targetShelfId);

        // После перемещения читаем уже ресинхронизированную полку из стора и
        // вычисляем ячейку, которую коробка заняла визуально, чтобы сразу
        // сохранить её координаты — иначе после перезахода позиция «плавает».
        const state = useStellageStore.getState();
        const isMain = !activeShelfId || activeShelfId === state.mainShelf?.id;
        const shelf = isMain ? state.mainShelf : state.selectedShelf;
        if (!shelf) return;

        const placed = placeBoxes(shelf.boxes, 5, 8);
        const slot = placed.find((p) => p.box.id === instanceId);
        if (slot) {
            updateBoxPosition(instanceId, slot.row, slot.col, targetShelfId);
        }
    };

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
                    {/* Шапка со переключателем полок и кнопками действий. */}
                    <header className="shelf-header">
                        <div className="shelf-header-left">
                            <h1 className="shelf-header-title">
                                {currentShelf?.title || "Твоя главная полка"}
                            </h1>
                            {shelves.length > 1 && (
                                <div className="shelf-dropdown-wrapper">
                                    <select
                                        className="shelf-dropdown"
                                        value={activeShelfId || mainShelf?.id || ""}
                                        onChange={(e) => handleSelectShelf(e.target.value)}
                                    >
                                        {shelves.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.title}
                                                {s.is_main ? " ★" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="shelf-header-right">
                            {currentShelf?.is_public && <span className="badge">ПУБЛИЧНАЯ</span>}
                            <button
                                type="button"
                                className="create-shelf-btn"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                + Создать стеллаж
                            </button>
                        </div>
                    </header>

                    {/* Лоток инвентаря: полученные коробки, ещё не на полке. */}
                    {trayBoxes.length > 0 && (
                        <div className="inventory-tray">
                            <h2 className="inventory-tray-title">
                                Инвентарь ({trayBoxes.length})
                            </h2>
                            <p className="inventory-tray-hint">
                                Нажми на коробку, чтобы поставить её на стеллаж.
                            </p>
                            <div className="inventory-tray-items">
                                {trayBoxes.map((box) => (
                                    <button
                                        key={box.id}
                                        type="button"
                                        className="inventory-tray-item"
                                        onClick={() => handlePlaceOnShelf(box.id)}
                                        disabled={!currentShelf}
                                        title="Поставить на полку"
                                    >
                                        <span className="inventory-tray-item-name">
                                            {box.template.title}
                                        </span>
                                        <span className="inventory-tray-item-cta">
                                            На полку →
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentShelf ? (
                        <ShelfView
                            shelf={currentShelf}
                            editable
                            onMove={(id, row, col) => updateBoxPosition(id, row, col, currentShelf!.id)}
                        />
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
