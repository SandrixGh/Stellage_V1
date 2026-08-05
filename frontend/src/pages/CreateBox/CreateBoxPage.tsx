import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { Select } from "../../components/UI/Select";
import { Avatar } from "../../components/UI/Avatar";
import { StellaCoinIcon } from "../../components/UI/StellaCoinIcon";
import { resolveRarityVisual } from "../../data/mockTemplates";
import {
    MAX_ASSETS_PER_BOX,
    MAX_BYTES,
    PHOTO_MIME_TYPES,
    VIDEO_MIME_TYPES,
    formatBytes,
    kindForMime,
    uploadBoxAsset,
    uploadErrorMessage,
} from "../../api/assets";
import type { AssetKind } from "../../types/Stellage/boxes";
import "./CreateBoxPage.css";

// Значения совпадают с BoxRarity на бэкенде. Доступно только суперюзерам —
// обычным пользователям сервер всё равно форсит COMMON.
const RARITY_OPTIONS = [
    { value: "common", label: "Common" },
    { value: "rare", label: "Rare" },
    { value: "golden", label: "Golden" },
    { value: "developer's", label: "Developer's" },
];

const VISIBILITY_OPTIONS = [
    { value: "public", label: "Публичная (Видна всем)" },
    { value: "private", label: "Приватная (Видна только вам)" },
];

interface StagedFile {
    id: string;
    file: File;
    kind: AssetKind | null; // null = невалидный файл, загружаться не будет
    progress: number;       // 0..1
    status: "queued" | "uploading" | "done" | "error";
    error?: string;
}

const validateFile = (file: File): Pick<StagedFile, "kind" | "status" | "error"> => {
    const kind = kindForMime(file.type);
    if (!kind) {
        return { kind: null, status: "error", error: "Неподдерживаемый тип файла" };
    }
    if (file.size > MAX_BYTES[kind]) {
        return {
            kind,
            status: "error",
            error: `Файл больше лимита ${formatBytes(MAX_BYTES[kind])}`,
        };
    }
    return { kind, status: "queued" };
};

export const CreateBoxPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isSuperuser = useAuthStore((s) => s.user?.is_superuser ?? false);
    const createBox = useStellageStore((s) => s.createBox);
    const fetchInstances = useStellageStore((s) => s.fetchInstances);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0");
    const [rarity, setRarity] = useState("common");
    const [isPublic, setIsPublic] = useState<"public" | "private">("public");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<StagedFile[]>([]);
    // Коробка уже создана (метаданные заморожены) — дальше только догружаем файлы.
    const [createdBoxId, setCreatedBoxId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isAuthenticated || !user) {
        return (
            <div className="create-box-gate">
                <div className="create-box-gate-visual">
                    <WireframeBox size={240} />
                </div>
                <div className="create-box-gate-content">
                    <h1 className="create-box-gate-title">Создать коробку</h1>
                    <p className="create-box-gate-sub">Войдите, чтобы создавать коробки.</p>
                    <Link to="/login" className="create-box-gate-btn">Войти</Link>
                </div>
            </div>
        );
    }

    const authorNickname = user.nickname?.trim() || user.username || "Создатель";
    const authorUsername = user.username ? `@${user.username}` : "@stellage";
    const { rarityGlow, boxColor } = resolveRarityVisual(isSuperuser ? rarity : "common");
    const priceNum = Math.max(0, Number(price) || 0);

    const patchFile = (id: string, patch: Partial<StagedFile>) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    };

    const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? []);
        e.target.value = ""; // позволяем выбрать тот же файл повторно
        if (!picked.length) return;

        // Если выложены файлы кода/текста — считываем их в поле текстового наполнения коробки
        picked.forEach((file) => {
            if (file.type.startsWith("text/") || /\.(py|js|ts|cpp|cs|json|md|txt|html|css|latex)$/i.test(file.name)) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target?.result as string;
                    if (text) {
                        setContent((prev) => (prev ? prev + "\n\n" + text : text));
                    }
                };
                reader.readAsText(file);
            }
        });

        // Медиафайлы (фото и видео) уходят на S3
        const mediaPicked = picked.filter((f) => PHOTO_MIME_TYPES.includes(f.type) || VIDEO_MIME_TYPES.includes(f.type));

        if (mediaPicked.length > 0) {
            setFiles((prev) => {
                const free = MAX_ASSETS_PER_BOX - prev.length;
                const next = mediaPicked.slice(0, Math.max(free, 0)).map((file) => ({
                    id: crypto.randomUUID(),
                    file,
                    progress: 0,
                    ...validateFile(file),
                }));
                if (mediaPicked.length > free) {
                    setError(`Не больше ${MAX_ASSETS_PER_BOX} медиа-файлов на коробку`);
                }
                return [...prev, ...next];
            });
        }
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    // Валидные файлы, ещё не загруженные (queued или упавшие — для повтора).
    const pendingUploads = files.filter((f) => f.kind && f.status !== "done");
    const hasInvalid = files.some((f) => !f.kind);

    const uploadStaged = async (boxId: string): Promise<number> => {
        let failures = 0;
        for (const item of pendingUploads) {
            patchFile(item.id, { status: "uploading", progress: 0, error: undefined });
            try {
                await uploadBoxAsset(boxId, item.file, (fraction) => {
                    patchFile(item.id, { progress: fraction });
                });
                patchFile(item.id, { status: "done", progress: 1 });
            } catch (err) {
                failures += 1;
                patchFile(item.id, { status: "error", error: uploadErrorMessage(err) });
            }
        }
        return failures;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = title.trim();
        if ((!createdBoxId && trimmed.length < 1) || saving || hasInvalid) return;
        setSaving(true);
        setError(null);

        // Шаг 1: создаём коробку (валюта форсируется в "stella" - Stellacoin)
        let boxId = createdBoxId;
        if (!boxId) {
            const text = content.trim();
            const box = await createBox({
                title: trimmed,
                description: description.trim() || undefined,
                price: Number(price) || 0,
                currency: "stella",
                content: text ? { text } : undefined,
                rarity: isSuperuser ? rarity : undefined,
                is_public: isPublic,
            });
            if (!box) {
                setSaving(false);
                setError("Не удалось создать коробку. Попробуйте позже.");
                return;
            }
            boxId = box.id;
            setCreatedBoxId(boxId);
        }

        // Шаг 2: загружаем файлы напрямую в S3 (через presigned POST).
        const failures = await uploadStaged(boxId);
        setSaving(false);

        if (failures === 0) {
            await fetchInstances();
            navigate("/inventory");
        } else {
            setError(
                "Коробка создана, но часть файлов не загрузилась. " +
                "Повторите загрузку или удалите их из списка."
            );
        }
    };

    const metaLocked = saving || createdBoxId !== null;

    return (
        <section className="create-box-page">
            <header className="create-box-head">
                <h1 className="create-box-title">Создать коробку</h1>
                <p className="create-box-sub">
                    Новая коробка попадёт в твой инвентарь.
                    {!isSuperuser && " Редкость — Common."}
                </p>
            </header>

            <div className="create-box-split-layout">
                {/* ── LEFT COLUMN: LIVE CARD PREVIEW ── */}
                <div className="create-box-preview-side">
                    <span className="create-preview-badge">Live Preview</span>
                    <div className={`create-preview-card rarity-${rarity.toLowerCase()}`}>
                        <div className="template-card-header">
                            <div className="template-card-author">
                                <Avatar name={authorNickname} size={34} />
                                <div className="author-text-meta">
                                    <span className="author-nickname">{authorNickname}</span>
                                    <span className="author-username">{authorUsername}</span>
                                </div>
                            </div>
                        </div>

                        <div className="template-card-visual">
                            <WireframeBox
                                size={140}
                                rarityGlow={rarityGlow}
                                color={boxColor}
                            />
                        </div>

                        <div className="template-card-body">
                            <h3 className="template-card-title">
                                {title.trim() || "Название коробки"}
                            </h3>
                        </div>

                        <div className="template-card-footer">
                            <div className="template-card-price-row">
                                <div className="template-card-price">
                                    {priceNum === 0 ? (
                                        <span className="price-free">Бесплатно</span>
                                    ) : (
                                        <span className="price-stella">
                                            <StellaCoinIcon size={18} /> {priceNum.toLocaleString("ru-RU")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button type="button" className="template-card-buy-btn" disabled>
                                {priceNum === 0 ? (
                                    "Забрать бесплатно"
                                ) : (
                                    <>
                                        <span>Забрать за</span>
                                        <StellaCoinIcon size={15} />
                                        <span>{priceNum.toLocaleString("ru-RU")}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN: CREATION FORM ── */}
                <form className="create-box-form" onSubmit={handleSubmit}>
                    <label className="create-box-field">
                        <span className="create-box-label">Название *</span>
                        <input
                            className="create-box-input"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Название вашей коробки"
                            maxLength={100}
                            disabled={metaLocked}
                            autoFocus
                        />
                    </label>

                    <label className="create-box-field">
                        <span className="create-box-label">Описание</span>
                        <textarea
                            className="create-box-input create-box-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="О чём эта коробка?"
                            maxLength={100}
                            rows={2}
                            disabled={metaLocked}
                        />
                    </label>

                    <div className="create-box-row">
                        <label className="create-box-field">
                            <span className="create-box-label">Цена в Stellacoin</span>
                            <div className="create-box-price-input-wrap">
                                <input
                                    className="create-box-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    disabled={metaLocked}
                                />
                                <span className="price-coin-suffix">
                                    <StellaCoinIcon size={18} />
                                </span>
                            </div>
                        </label>

                        <div className="create-box-field">
                            <span className="create-box-label">Доступность</span>
                            <Select
                                value={isPublic}
                                options={VISIBILITY_OPTIONS}
                                onChange={(val) => setIsPublic(val as "public" | "private")}
                                ariaLabel="Доступность"
                            />
                        </div>

                        {isSuperuser && (
                            <div className="create-box-field">
                                <span className="create-box-label">Редкость</span>
                                <Select
                                    value={rarity}
                                    options={RARITY_OPTIONS}
                                    onChange={setRarity}
                                    ariaLabel="Редкость"
                                />
                            </div>
                        )}
                    </div>

                <label className="create-box-field">
                    <span className="create-box-label">Код / Markdown / LaTeX / Текст внутри коробки</span>
                    <textarea
                        className="create-box-input create-box-textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Введите Python код, Markdown, LaTeX формулы ($$\frac{a}{b}$$) или текст..."
                        rows={5}
                        disabled={metaLocked}
                    />
                </label>

                <div className="create-box-field">
                    <span className="create-box-label">Медиа & Файлы кода</span>
                    <label className="create-box-file-add">
                        <input
                            type="file"
                            accept="image/*,video/*,.py,.js,.ts,.tsx,.jsx,.cpp,.c,.h,.cs,.java,.json,.md,.txt,.html,.css,.latex,.tex,.sql,.sh,.yaml,.yml"
                            multiple
                            hidden
                            onChange={addFiles}
                            disabled={saving || files.length >= MAX_ASSETS_PER_BOX}
                        />
                        + Загрузить медиа (Фото/Видео) или файл кода (.py/.md/.txt)
                    </label>

                    {files.length > 0 && (
                        <ul className="create-box-files">
                            {files.map((f) => (
                                <li key={f.id} className={`create-box-file is-${f.status}`}>
                                    <div className="create-box-file-info">
                                        <span className="create-box-file-name" title={f.file.name}>
                                            {f.file.name}
                                        </span>
                                        <span className="create-box-file-size">
                                            {formatBytes(f.file.size)}
                                        </span>
                                    </div>
                                    {f.status === "uploading" && (
                                        <div className="create-box-file-bar">
                                            <div
                                                className="create-box-file-bar-fill"
                                                style={{ width: `${Math.round(f.progress * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                    {f.error && (
                                        <span className="create-box-file-error">{f.error}</span>
                                    )}
                                    {f.status === "done" ? (
                                        <span className="create-box-file-done" aria-label="Загружен">✓</span>
                                    ) : (
                                        <button
                                            type="button"
                                            className="create-box-file-remove"
                                            aria-label="Убрать файл"
                                            onClick={() => removeFile(f.id)}
                                            disabled={saving}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <span className="create-box-hint">
                        До {MAX_ASSETS_PER_BOX} файлов: фото до {formatBytes(MAX_BYTES.photo)},
                        видео до {formatBytes(MAX_BYTES.video)}.
                    </span>
                </div>

                {error && <p className="create-box-error">{error}</p>}

                <div className="create-box-actions">
                    <Link to="/inventory" className="create-box-btn ghost">
                        {createdBoxId ? "В инвентарь" : "Отмена"}
                    </Link>
                    <button
                        type="submit"
                        className="create-box-btn primary"
                        disabled={
                            saving
                            || hasInvalid
                            || (!createdBoxId && title.trim().length < 1)
                            || (createdBoxId !== null && pendingUploads.length === 0)
                        }
                    >
                        {saving
                            ? "Загрузка…"
                            : createdBoxId
                                ? "Повторить загрузку"
                                : "Создать коробку"}
                    </button>
                </div>
            </form>
            </div>
        </section>
    );
};
