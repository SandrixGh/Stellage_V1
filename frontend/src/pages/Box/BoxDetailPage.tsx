import { Link, Navigate, useParams } from "react-router-dom";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import {
    MOCK_TEMPLATES,
    MOCK_BOX_EXTRAS,
    formatPrice,
    getRarityClass,
    resolveRarityVisual,
    type BoxExtra,
} from "../../data/mockTemplates";
import "./BoxDetailPage.css";

/* ── Fallback extras for any box id missing from the mock map ── */
const DEFAULT_EXTRA: BoxExtra = {
    owner: "stellage",
    stellage: null,
    is_public: "public",
};

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

    const template = MOCK_TEMPLATES.find((t) => t.id === id);
    if (!template) {
        return <Navigate to="/feed" replace />;
    }

    const extras: BoxExtra = (id && MOCK_BOX_EXTRAS[id]) || DEFAULT_EXTRA;
    const { rarityGlow, boxColor } = resolveRarityVisual(template.rarity);
    const rarityClass = getRarityClass(template.rarity);
    const isPublic = extras.is_public === "public";

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
                            <dt>Стеллаж</dt>
                            <dd>{extras.stellage ?? "Не на стеллаже"}</dd>
                        </div>
                        <div className="box-detail-meta-row">
                            <dt>Владелец</dt>
                            <dd>{extras.owner}</dd>
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
