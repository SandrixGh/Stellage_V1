import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { Avatar } from "../../components/UI/Avatar";
import { Select } from "../../components/UI/Select";
import { StellaCoinIcon } from "../../components/UI/StellaCoinIcon";
import { SmartContentInspector } from "../../components/Stellage/SmartContentInspector";
import { uploadBoxAsset } from "../../api/assets";
import { resolveRarityVisual } from "../../data/mockTemplates";
import type { BoxContent } from "../../types/Stellage/boxes";
import "./CreateBoxPage.css";

interface StagedFile {
    id: string;
    file: File;
    status: "queued" | "uploading" | "done" | "error";
    progress: number;
    error?: string;
    kind?: "photo" | "video";
}

interface FormBlock {
    id: string;
    title: string;
    mode: "code" | "text" | "todo";
    text: string;
    is_completed: boolean;
}

const MAX_ASSETS_PER_BOX = 10;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 МБ
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 МБ

const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const RARITY_OPTIONS = [
    { label: "Common", value: "common" },
    { label: "Rare", value: "rare" },
    { label: "Golden", value: "golden" },
    { label: "Developer's", value: "developer's" },
];

const VISIBILITY_OPTIONS = [
    { label: "Публичная", value: "public" },
    { label: "Приватная (Секретная)", value: "private" },
];

const MODE_OPTIONS = [
    { label: "Код (с нумерацией)", value: "code" },
    { label: "Текст / Документ", value: "text" },
    { label: "Список задач / Чекбокс", value: "todo" },
];

function validateFile(file: File): { kind?: "photo" | "video"; error?: string } {
    const mime = file.type.toLowerCase();
    if (PHOTO_MIME_TYPES.includes(mime)) {
        if (file.size > MAX_PHOTO_BYTES) return { error: "Фотография превышает лимит 10 МБ" };
        return { kind: "photo" };
    }
    if (VIDEO_MIME_TYPES.includes(mime)) {
        if (file.size > MAX_VIDEO_BYTES) return { error: "Видеозапись превышает лимит 100 МБ" };
        return { kind: "video" };
    }
    return { error: "Формат не поддерживается. Разрешены только JPG, PNG, WEBP, GIF, MP4, WEBM, MOV." };
}

function uploadErrorMessage(err: unknown): string {
    const ax = err as { response?: { data?: { detail?: string }; status?: number } };
    if (ax.response?.status === 413) return "Файл слишком большой для сервера";
    return ax.response?.data?.detail || "Сбой загрузки на S3";
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CreateBoxPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const createBox = useStellageStore((s) => s.createBox);
    const fetchInstances = useStellageStore((s) => s.fetchInstances);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0");
    const [rarity, setRarity] = useState("common");
    const [isPublic, setIsPublic] = useState<"public" | "private">("public");

    // Множественные окна контента коробки
    const [blocks, setBlocks] = useState<FormBlock[]>([
        { id: "b-1", title: "Окно 1", mode: "code", text: "", is_completed: false },
    ]);

    const [files, setFiles] = useState<StagedFile[]>([]);
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

    const isCanSelectRarity = Boolean(
        user?.is_superuser ||
        user?.is_developer ||
        (user?.username && ["sandrix", "pan_covets"].includes(user.username.toLowerCase()))
    );

    const authorNickname = user.nickname?.trim() || user.username || "Создатель";
    const authorUsername = user.username ? `@${user.username}` : "@stellage";
    const { rarityGlow, boxColor } = resolveRarityVisual(isCanSelectRarity ? rarity : "common");
    const priceNum = Math.max(0, Number(price) || 0);

    const addBlock = () => {
        const nextNum = blocks.length + 1;
        setBlocks((prev) => [
            ...prev,
            { id: crypto.randomUUID(), title: `Окно ${nextNum}`, mode: "code", text: "", is_completed: false },
        ]);
    };

    const removeBlock = (id: string) => {
        if (blocks.length <= 1) return;
        setBlocks((prev) => prev.filter((b) => b.id !== id));
    };

    const updateBlock = (id: string, patch: Partial<FormBlock>) => {
        setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    };

    const patchFile = (id: string, patch: Partial<StagedFile>) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    };

    const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (!picked.length) return;

        // Код / текстовые файлы заносятся как отдельные новые окна контента!
        picked.forEach((file) => {
            if (file.type.startsWith("text/") || /\.(py|js|ts|tsx|jsx|cpp|cs|json|md|txt|html|css|latex|tex|sql)$/i.test(file.name)) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target?.result as string;
                    if (text) {
                        setBlocks((prev) => [
                            ...prev,
                            {
                                id: crypto.randomUUID(),
                                title: file.name,
                                mode: file.name.endsWith(".md") || file.name.endsWith(".txt") ? "text" : "code",
                                text,
                                is_completed: false,
                            },
                        ]);
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
                const next: StagedFile[] = mediaPicked.slice(0, Math.max(free, 0)).map((file) => ({
                    id: crypto.randomUUID(),
                    file,
                    status: "queued" as const,
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

        let boxId = createdBoxId;
        if (!boxId) {
            const validBlocks = blocks.filter((b) => b.text.trim().length > 0 || b.title.trim().length > 0);
            const fullText = validBlocks.map((b) => b.text).filter(Boolean).join("\n\n");

            const contentPayload: BoxContent | undefined = validBlocks.length > 0 ? {
                text: fullText,
                blocks: validBlocks.map((b, i) => ({
                    id: b.id || `b-${i}`,
                    title: b.title.trim() || `Окно ${i + 1}`,
                    mode: b.mode,
                    text: b.text,
                    is_completed: b.is_completed,
                })),
            } : undefined;

            const box = await createBox({
                title: trimmed,
                description: description.trim() || undefined,
                price: Number(price) || 0,
                currency: "stella",
                content: contentPayload,
                rarity: isCanSelectRarity ? rarity : undefined,
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

    const previewContent: BoxContent = {
        text: blocks.map((b) => b.text).filter(Boolean).join("\n\n"),
        blocks: blocks.map((b, i) => ({
            id: b.id || `b-${i}`,
            title: b.title.trim() || `Окно ${i + 1}`,
            mode: b.mode,
            text: b.text,
            is_completed: b.is_completed,
        })),
    };

    return (
        <section className="create-box-page">
            <header className="create-box-head">
                <h1 className="create-box-title">Создать коробку</h1>
                <p className="create-box-sub">
                    Новая коробка попадёт в твой инвентарь.
                    {!isCanSelectRarity && " Редкость — Common."}
                </p>
            </header>

            <div className="create-box-split-layout">
                {/* ── LEFT COLUMN: LIVE CARD PREVIEW & INSPECTOR PREVIEW ── */}
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

                    {/* Предпросмотр умного инспектора окон контента */}
                    {blocks.some((b) => b.text.trim().length > 0 || b.title.trim().length > 0) && (
                        <div className="create-box-inspector-preview">
                            <SmartContentInspector
                                rawContent={previewContent}
                                boxTitle={title.trim() || "Коробка"}
                            />
                        </div>
                    )}
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

                        {isCanSelectRarity && (
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

                    {/* ── МУЛЬТИ-БЛОЧНЫЙ КОНСТРУКТОР ОКОН КОНТЕНТА ── */}
                    <div className="create-box-blocks-section">
                        <div className="create-box-blocks-header">
                            <span className="create-box-label">Окна контента коробки ({blocks.length})</span>
                            <button
                                type="button"
                                className="create-box-add-block-btn"
                                onClick={addBlock}
                                disabled={metaLocked}
                            >
                                + Добавить окно
                            </button>
                        </div>

                        {blocks.map((block, idx) => (
                            <div key={block.id} className="create-box-block-card">
                                <div className="create-box-block-top">
                                    <input
                                        type="text"
                                        className="create-box-input create-box-block-title-input"
                                        value={block.title}
                                        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                        placeholder={`Название окна ${idx + 1}...`}
                                        disabled={metaLocked}
                                    />

                                    <div className="create-box-block-mode-select">
                                        <Select
                                            value={block.mode}
                                            options={MODE_OPTIONS}
                                            onChange={(val) => updateBlock(block.id, { mode: val as "code" | "text" | "todo" })}
                                            ariaLabel="Режим отображения"
                                        />
                                    </div>

                                    {blocks.length > 1 && (
                                        <button
                                            type="button"
                                            className="create-box-block-remove-btn"
                                            onClick={() => removeBlock(block.id)}
                                            disabled={metaLocked}
                                            title="Удалить окно"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <textarea
                                    className="create-box-input create-box-textarea"
                                    value={block.text}
                                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                    placeholder={
                                        block.mode === "code"
                                            ? "Введите код (Python, JS, C++, HTML...)"
                                            : block.mode === "todo"
                                            ? "Введите список задач (каждая строка — пункт):\n[ ] Задача 1\n[ ] Задача 2"
                                            : "Введите текст..."
                                    }
                                    rows={4}
                                    disabled={metaLocked}
                                />
                            </div>
                        ))}
                    </div>

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
                    </div>

                    {error && <div className="create-box-error">{error}</div>}

                    <div className="create-box-actions">
                        <button
                            type="submit"
                            className="create-box-submit-btn"
                            disabled={title.trim().length < 1 || saving || hasInvalid}
                        >
                            {saving ? "Создание…" : createdBoxId ? "Повторить загрузку файлов" : "Создать коробку"}
                        </button>

                        <Link to="/" className="create-box-cancel-btn">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </section>
    );
};
