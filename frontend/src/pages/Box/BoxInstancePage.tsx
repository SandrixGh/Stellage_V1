import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getBoxView, type BoxPublicView } from "../../api/boxes";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { ContentGrid } from "../../components/Stellage/ContentGrid";
import { LikeButton } from "../../components/Stellage/LikeButton";
import { Avatar } from "../../components/UI/Avatar";
import { useAuthStore } from "../../store/useAuthStore";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import { rarityKey } from "../../utils/rarity";
import "./BoxInstancePage.css";

const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    } catch {
        return iso;
    }
};

/**
 * Детальный просмотр коробки (второй режим, отдельная страница /box/instance/:id).
 * Здесь — крупный визуал коробки, карточка владельца и контент во всю ширину с
 * лайтбоксом и полным текстом. Открывается из быстрого просмотра и по прямой
 * ссылке; работает и для чужой публичной коробки (видимость решает бэкенд).
 */
export const BoxInstancePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const [view, setView] = useState<BoxPublicView | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        setNotFound(false);
        getBoxView(id)
            .then((v) => {
                if (!cancelled) setView(v);
            })
            .catch(() => {
                if (!cancelled) setNotFound(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return <div className="status-info">Загрузка коробки…</div>;
    }
    if (notFound || !view) {
        return (
            <div className="box-page-missing">
                <p>Коробка не найдена или скрыта.</p>
                <button type="button" className="box-page-back" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
            </div>
        );
    }

    const { box, owner, is_owner } = view;
    const { template } = box;
    const key = rarityKey(template.rarity);
    const { rarityGlow: glow, boxColor } = resolveRarityVisual(template.rarity ?? "common");
    const contentText = typeof box.content?.text === "string" ? box.content.text : "";
    const assets = box.assets ?? [];
    const ownerName = owner.nickname?.trim() || owner.username || "Пользователь";

    return (
        <div className={`box-page rarity-${key}`}>
            <button type="button" className="box-page-back" onClick={() => navigate(-1)}>
                ← Назад
            </button>

            <div className="box-page-grid">
                {/* ── Сама коробка ── */}
                <div className="box-page-visual">
                    <span className="box-page-aura" aria-hidden="true" />
                    <WireframeBox
                        size={300}
                        rarityGlow={glow}
                        color={boxColor}
                        contentType={resolveBoxContentType(box)}
                    />
                </div>

                {/* ── Метаданные + владелец ── */}
                <div className="box-page-info">
                    <div className="box-page-head">
                        <h1 className="box-page-title">{template.title}</h1>
                        <span
                            className={`box-page-rarity rarity-tag-${key}`}
                            style={{ color: boxColor }}
                        >
                            {template.rarity}
                        </span>
                    </div>

                    {template.description && (
                        <p className="box-page-desc">{template.description}</p>
                    )}

                    {/* Владелец коробки. */}
                    {owner.username ? (
                        <Link to={`/u/${owner.username}`} className="box-page-owner">
                            <Avatar url={owner.avatar_url} name={ownerName} size={44} />
                            <span className="box-page-owner-text">
                                <span className="box-page-owner-name">{ownerName}</span>
                                {owner.bio && (
                                    <span className="box-page-owner-bio">{owner.bio}</span>
                                )}
                            </span>
                        </Link>
                    ) : (
                        <div className="box-page-owner">
                            <Avatar url={owner.avatar_url} name={ownerName} size={44} />
                            <span className="box-page-owner-name">{ownerName}</span>
                        </div>
                    )}

                    <dl className="box-page-meta">
                        <div className="box-page-meta-row">
                            <dt>Цена</dt>
                            <dd>{template.price} {template.currency}</dd>
                        </div>
                        <div className="box-page-meta-row">
                            <dt>Серийный номер</dt>
                            <dd>#{box.serial_number}</dd>
                        </div>
                        <div className="box-page-meta-row">
                            <dt>Статус</dt>
                            <dd>
                                {box.is_sealed === "sealed" ? "Запечатана" : "Распечатана"}
                                {" · "}
                                {box.is_public === "public" ? "Публичная" : "Приватная"}
                            </dd>
                        </div>
                        <div className="box-page-meta-row">
                            <dt>Добавлена</dt>
                            <dd>{formatDate(box.created_at)}</dd>
                        </div>
                    </dl>

                    <div className="box-page-like">
                        <LikeButton instanceId={box.id} canLike={!!user} />
                    </div>
                </div>
            </div>

            {/* ── Контент детально ── */}
            <div className="box-page-content">
                <h2 className="box-page-content-title">Содержимое</h2>

                {contentText && (
                    <p className="box-page-content-text">{contentText}</p>
                )}

                {assets.length > 0 && <ContentGrid assets={assets} />}

                {!contentText && assets.length === 0 && (
                    <p className="box-page-content-empty">
                        {is_owner ? "Коробка пока пуста." : "Содержимое скрыто или коробка пуста."}
                    </p>
                )}
            </div>
        </div>
    );
};
