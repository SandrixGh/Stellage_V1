import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ShelfView } from "../../components/Stellage/ShelfView";
import { placeBoxes } from "../../components/Stellage/ShelfBoard";
import { InventoryPickerModal } from "../../components/Stellage/InventoryPickerModal";
import { BoxDetailModal } from "../Box/BoxDetailModal";
import type { Box } from "../../types/Stellage/boxes";
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
        setMainShelf,
        instances,
        fetchInstances,
        moveBox,
        isLoading,
    } = useStellageStore();

    // id активной (открытой на доске) полки. null = ещё не выбрана.
    const [activeShelfId, setActiveShelfId] = useState<string | null>(null);

    // id главной полки: помеченная is_main, иначе первая из списка
    // (запасной вариант на случай, если в БД ни одна не отмечена главной).
    const mainShelfId = useMemo(
        () => shelves.find((s) => s.is_main)?.id ?? shelves[0]?.id ?? null,
        [shelves]
    );

    // Список полок для правой колонки: главная первой, остальные — следом.
    const orderedShelves = useMemo(() => {
        if (!mainShelfId) return shelves;
        const main = shelves.find((s) => s.id === mainShelfId);
        const rest = shelves.filter((s) => s.id !== mainShelfId);
        return main ? [main, ...rest] : rest;
    }, [shelves, mainShelfId]);

    // Модалка-пикер инвентаря («Добавить коробку») и просмотр коробки.
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [openedBox, setOpenedBox] = useState<Box | null>(null);

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

    const handleSelectShelf = (shelfId: string) => {
        setActiveShelfId(shelfId);
        // Главная полка уже загружена с коробками через fetchMainShelf; для
        // остальных (или если главной нет в сторе) подгружаем содержимое.
        if (shelfId !== mainShelf?.id) {
            fetchShelfWithBoxes(shelfId);
        }
    };

    // Как только список полок загружен — автоматически открываем главную.
    useEffect(() => {
        if (!activeShelfId && mainShelfId) {
            handleSelectShelf(mainShelfId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainShelfId]);

    // Полка, активная сейчас на доске.
    const currentShelf =
        activeShelfId == null
            ? null
            : activeShelfId === mainShelf?.id
                ? mainShelf
                : selectedShelf?.id === activeShelfId
                    ? selectedShelf
                    : null;

    // Коробки в инвентаре — ещё не поставленные на полку.
    const trayBoxes = instances.filter((b) => b.shelf_id === null);

    const handlePlaceOnShelf = async (instanceId: string) => {
        if (!currentShelf) return;
        const targetShelfId = currentShelf.id;
        setIsPickerOpen(false);
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
                    {currentShelf ? (
                        <ShelfView
                            shelf={currentShelf}
                            editable
                            onMove={(id, row, col) => updateBoxPosition(id, row, col, currentShelf!.id)}
                            onOpen={setOpenedBox}
                            isMain={currentShelf.id === mainShelfId}
                            onMakeMain={() => setMainShelf(currentShelf.id)}
                            rightPanel={
                                <div className="shelf-rail">
                                    <button
                                        type="button"
                                        className="add-box-btn shelf-rail-add"
                                        onClick={() => setIsPickerOpen(true)}
                                    >
                                        + Добавить коробку
                                    </button>
                                    <button
                                        type="button"
                                        className="create-shelf-btn shelf-rail-create"
                                        onClick={() => setIsCreateOpen(true)}
                                    >
                                        + Создать стеллаж
                                    </button>
                                    {orderedShelves.map((s) => {
                                        const isActive = s.id === currentShelf.id;
                                        const isMain = s.id === mainShelfId;
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                className={`shelf-rail-item${isActive ? " active" : ""}`}
                                                onClick={() => handleSelectShelf(s.id)}
                                            >
                                                <span className="shelf-rail-item-title">{s.title}</span>
                                                {isMain && <span className="shelf-rail-star">★</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            }
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

            {isPickerOpen && (
                <InventoryPickerModal
                    boxes={trayBoxes}
                    onPick={handlePlaceOnShelf}
                    onClose={() => setIsPickerOpen(false)}
                    disabled={!currentShelf}
                />
            )}

            <BoxDetailModal box={openedBox} onClose={() => setOpenedBox(null)} />
        </section>
    );
};
