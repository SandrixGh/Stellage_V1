import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { Select } from "../../components/UI/Select";
import {
    ACCEPT_ATTR,
    MAX_ASSETS_PER_BOX,
    MAX_BYTES,
    formatBytes,
    kindForMime,
    uploadBoxAsset,
    uploadErrorMessage,
} from "../../api/assets";
import type { AssetKind } from "../../types/Stellage/boxes";
import "./CreateBoxPage.css";

const CURRENCIES = ["RUB", "USD", "EUR", "GBP", "CNY", "JPY", "KZT", "BYN", "TRY"];
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

// Значения совпадают с BoxRarity на бэкенде. Доступно только суперюзерам —
// обычным пользователям сервер всё равно форсит COMMON.
const RARITY_OPTIONS = [
    { value: "common", label: "Common" },
    { value: "rare", label: "Rare" },
    { value: "golden", label: "Golden" },
    { value: "developer's", label: "Developer's" },
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
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isSuperuser = useAuthStore((s) => s.user?.is_superuser ?? false);
    const createBox = useStellageStore((s) => s.createBox);
    const fetchInstances = useStellageStore((s) => s.fetchInstances);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0");
    const [currency, setCurrency] = useState("RUB");
    const [rarity, setRarity] = useState("common");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<StagedFile[]>([]);
    // Коробка уже создана (метаданные заморожены) — дальше только догружаем файлы.
    const [createdBoxId, setCreatedBoxId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isAuthenticated) {
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

    const patchFile = (id: string, patch: Partial<StagedFile>) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    };

    const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? []);
        e.target.value = ""; // позволяем выбрать тот же файл повторно
        if (!picked.length) return;

        setFiles((prev) => {
            const free = MAX_ASSETS_PER_BOX - prev.length;
            const next = picked.slice(0, Math.max(free, 0)).map((file) => ({
                id: crypto.randomUUID(),
                file,
                progress: 0,
                ...validateFile(file),
            }));
            if (picked.length > free) {
                setError(`Не больше ${MAX_ASSETS_PER_BOX} файлов на коробку`);
            }
            return [...prev, ...next];
        });
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

        // Шаг 1: создаём коробку (один раз — при частичном фейле загрузки
        // повторный сабмит только догружает файлы).
        let boxId = createdBoxId;
        if (!boxId) {
            const text = content.trim();
            const box = await createBox({
                title: trimmed,
                description: description.trim() || undefined,
                price: Number(price) || 0,
                currency,
                content: text ? { text } : undefined,
                rarity: isSuperuser ? rarity : undefined,
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
                <div className="create-box-visual">
                    <WireframeBox size={130} />
                </div>
                <div>
                    <h1 className="create-box-title">Создать коробку</h1>
                    <p className="create-box-sub">
                        Новая коробка попадёт в твой инвентарь.
                        {!isSuperuser && " Редкость — Common."}
                    </p>
                </div>
            </header>

            <form className="create-box-form" onSubmit={handleSubmit}>
                <label className="create-box-field">
                    <span className="create-box-label">Название</span>
                    <input
                        className="create-box-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Название коробки"
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
                        <span className="create-box-label">Цена</span>
                        <input
                            className="create-box-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            disabled={metaLocked}
                        />
                    </label>
                    <div className="create-box-field">
                        <span className="create-box-label">Валюта</span>
                        <Select
                            value={currency}
                            options={CURRENCY_OPTIONS}
                            onChange={setCurrency}
                            ariaLabel="Валюта"
                        />
                    </div>
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

                <label className="create-box-field">
                    <span className="create-box-label">Текст</span>
                    <textarea
                        className="create-box-input create-box-textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Текст, ссылка или заметка"
                        rows={4}
                        disabled={metaLocked}
                    />
                </label>

                <div className="create-box-field">
                    <span className="create-box-label">Файлы</span>
                    <label className="create-box-file-add">
                        <input
                            type="file"
                            accept={ACCEPT_ATTR}
                            multiple
                            hidden
                            onChange={addFiles}
                            disabled={saving || files.length >= MAX_ASSETS_PER_BOX}
                        />
                        + Добавить фото или видео
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
        </section>
    );
};
