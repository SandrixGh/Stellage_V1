import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { useStellageStore } from "../../store/useStellageStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
    formatPrice,
    getRarityClass,
    resolveRarityVisual,
    resolveContentType,
} from "../../data/mockTemplates";
import "./BoxDetailPage.css";



/* Format an ISO date string into a readable Russian date, e.g. "28 июня 2026". */
const formatDate = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
};

export const BoxDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const { templates, fetchTemplates, acquireBox } = useStellageStore();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [triedFetch, setTriedFetch] = useState(false);
    const [isAcquiring, setIsAcquiring] = useState(false);
    const [acquired, setAcquired] = useState(false);

    // Direct-URL navigation may skip the feed, so make sure the catalogue is loaded
    // before deciding a box is missing (otherwise a valid backend box bounces back).
    useEffect(() => {
        if (templates.length === 0) {
            fetchTemplates().finally(() => setTriedFetch(true));
        } else {
            setTriedFetch(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Resolve the box from the templates store.
    const template = templates.find((t) => t.id === id);

    if (!template) {
        // Still fetching — don't bounce a valid box back to the feed prematurely.
        if (!triedFetch) {
            return <div className="status-info">Загрузка коробки...</div>;
        }
        return <Navigate to="/feed" replace />;
    }

    const { rarityGlow, boxColor } = resolveRarityVisual(template.rarity);
    const rarityClass = getRarityClass(template.rarity);
    // As it's a public template from the feed, we can assume its instances can be public
    const isPublic = true;

    // Платную коробку пока получить нельзя (платёжка не выбрана) — кнопка задизейблена.
    const isFree = Number(template.price) === 0;

    const handleAcquire = async () => {
        if (!isFree || isAcquiring || acquired) return;
        setIsAcquiring(true);
        await acquireBox(template.id);
        setIsAcquiring(false);
        setAcquired(true);
    };

    return (
        <div className={`box-detail rarity-${rarityClass}`}>
            <Link to="/feed" className="box-detail-back">
                ← Назад в ленту
            </Link>

            <div className="box-detail-split">
                {/* ── LEFT: large wireframe with ambient rarity glow ── */}
                <div className="box-detail-visual">
                    <div className="box-detail-visual-inner">
                        <span className="box-detail-aura" aria-hidden="true" />
                        <WireframeBox
                            size={380}
                            rarityGlow={rarityGlow}
                            color={boxColor}
                            contentType={resolveContentType(template)}
                        />
                    </div>
                </div>

                {/* ── RIGHT: details ── */}
                <div className="box-detail-info">
                    <span className={`rarity-tag rarity-tag-${rarityClass}`}>
                        {template.rarity}
                    </span>

                    <h1 className="box-detail-title">{template.title}</h1>

                    <p className="box-detail-price">
                        {formatPrice(template.price, template.currency)}
                    </p>

                    {isFree ? (
                        <button
                            type="button"
                            className="box-detail-acquire"
                            onClick={handleAcquire}
                            disabled={!isAuthenticated || isAcquiring || acquired}
                        >
                            {!isAuthenticated
                                ? "Войдите, чтобы получить"
                                : acquired
                                    ? "Получено ✓"
                                    : isAcquiring
                                        ? "Получаем…"
                                        : "Получить бесплатно"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="box-detail-acquire"
                            disabled
                            title="Оплата пока недоступна"
                        >
                            Покупка скоро
                        </button>
                    )}

                    <hr className="box-detail-divider" />

                    <p className="box-detail-description">
                        {template.description}
                    </p>

                    <hr className="box-detail-divider" />

                    <dl className="box-detail-meta">
                        <div className="box-detail-meta-row">
                            <dt>Создано</dt>
                            <dd>{formatDate(template.created_at)}</dd>
                        </div>
                        <div className="box-detail-meta-row">
                            <dt>Владелец</dt>
                            <dd>{template.owner_username ?? "Stellage"}</dd>
                        </div>
                    </dl>

                    <hr className="box-detail-divider" />

                    {/* ── Content block: public placeholder vs private lock ── */}
                    {isPublic ? (
                        <div className="box-detail-content">
                            <h2 className="box-detail-content-title">Содержимое</h2>
                            <div className="box-detail-content-tiles">
                                <div className="box-detail-tile" />
                                <div className="box-detail-tile" />
                                <div className="box-detail-tile" />
                                <div className="box-detail-tile" />
                            </div>
                            <div className="box-detail-content-lines">
                                <span className="box-detail-line" />
                                <span className="box-detail-line short" />
                            </div>
                        </div>
                    ) : (
                        <div className="box-detail-locked">
                            <span className="box-detail-lock" aria-hidden="true">
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <rect
                                        x="5"
                                        y="10.5"
                                        width="14"
                                        height="10"
                                        rx="2.5"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                    />
                                    <path
                                        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                            <p className="box-detail-locked-text">
                                Контент скрыт — коробка приватная.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
