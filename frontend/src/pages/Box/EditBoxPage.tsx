import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../api/instance";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import { Avatar } from "../../components/UI/Avatar";
import { Select } from "../../components/UI/Select";
import { StellaCoinIcon } from "../../components/UI/StellaCoinIcon";
import { SmartContentInspector } from "../../components/Stellage/SmartContentInspector";
import { uploadBoxAsset, deleteAsset, uploadErrorMessage } from "../../api/assets";
import { resolveRarityVisual, resolveBoxContentType } from "../../data/mockTemplates";
import type { Box, BoxAsset, BoxContent, BoxContentBlock } from "../../types/Stellage/boxes";
import "../CreateBox/CreateBoxPage.css";

interface FormBlock {
    id: string;
    title: string;
    mode: "code" | "text" | "todo";
    text: string;
}

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

export const EditBoxPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const updateBox = useStellageStore((s) => s.updateBox);

    const [loading, setLoading] = useState(true);
    const [box, setBox] = useState<Box | null>(null);

    // Edit form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0");
    const [isPublic, setIsPublic] = useState<"public" | "private">("public");
    const [rarity, setRarity] = useState("common");
    const [blocks, setBlocks] = useState<FormBlock[]>([]);
    const [assets, setAssets] = useState<BoxAsset[]>([]);
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const isSuperuser = user?.is_superuser ?? false;
    const isDev = user?.is_developer ?? false;
    const isAllowedUser = user?.username && ["sandrix", "pan_covets"].includes(user.username.toLowerCase());
    const isCanSelectRarity = isSuperuser || isDev || isAllowedUser;

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get<Box>("/boxes/get-box-instance", { params: { instance_id: id } })
            .then((res) => {
                const fetched = res.data;
                setBox(fetched);
                const tpl = fetched.template;
                setTitle(tpl?.title ?? "");
                setDescription(tpl?.description ?? "");
                setPrice(String(Math.round(Number(tpl?.price) || 0)));
                setIsPublic(fetched.is_public ?? "public");
                setRarity((tpl?.rarity ?? "common").toLowerCase());
                setAssets(fetched.assets ?? []);

                if (fetched.content?.blocks && fetched.content.blocks.length > 0) {
                    setBlocks(
                        fetched.content.blocks.map((b) => ({
                            id: b.id || crypto.randomUUID(),
                            title: b.title || "Окно",
                            mode: b.mode || "code",
                            text: b.text || "",
                        }))
                    );
                } else if (fetched.content?.text) {
                    setBlocks([
                        {
                            id: "b-1",
                            title: "Окно 1",
                            mode: "code",
                            text: fetched.content.text,
                        },
                    ]);
                } else {
                    setBlocks([
                        {
                            id: "b-1",
                            title: "Окно 1",
                            mode: "code",
                            text: "",
                        },
                    ]);
                }
                setLoading(false);
            })
            .catch(() => {
                setError("Не удалось загрузить параметры коробки");
                setLoading(false);
            });
    }, [id]);

    const addBlock = () => {
        const nextNum = blocks.length + 1;
        setBlocks((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                title: `Окно ${nextNum}`,
                mode: "code",
                text: "",
            },
        ]);
    };

    const removeBlock = (blockId: string) => {
        if (blocks.length <= 1) return;
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    };

    const updateBlock = (blockId: string, patch: Partial<FormBlock>) => {
        setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
    };

    const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? []);
        if (picked.length === 0) return;

        // Если это текстовый файл или код — импортируем как новое окно
        const textFiles = picked.filter(
            (f) =>
                f.type.startsWith("text/") ||
                f.type.includes("latex") ||
                f.type.includes("tex") ||
                /\.(py|js|ts|tsx|jsx|cpp|c|h|cs|java|json|md|txt|html|css|latex|tex|sql|sh|yaml|yml)$/i.test(f.name)
        );

        textFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                if (text) {
                    setBlocks((prev) => [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            title: file.name,
                            mode: file.name.endsWith(".md") || file.name.endsWith(".txt") ? "text" : "code",
                            text,
                        },
                    ]);
                }
            };
            reader.readAsText(file);
        });

        // Картинки и видео сохраняем в список для загрузки
        const mediaFiles = picked.filter(
            (f) => !textFiles.includes(f) && (f.type.startsWith("image/") || f.type.startsWith("video/"))
        );
        if (mediaFiles.length > 0) {
            setStagedFiles((prev) => [...prev, ...mediaFiles]);
        }
    };

    const handleDeleteAsset = async (assetId: string) => {
        try {
            await deleteAsset(assetId);
            setAssets((prev) => prev.filter((a) => a.id !== assetId));
        } catch {
            setError("Не удалось удалить ассет");
        }
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!id || saving) return;
        const trimmed = title.trim();
        if (trimmed.length < 1) {
            setError("Укажите название коробки");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const validBlocks = blocks.filter((b) => b.text.trim().length > 0 || b.title.trim().length > 0);
            const fullText = validBlocks.map((b) => b.text).filter(Boolean).join("\n\n");

            const contentPayload: BoxContent | undefined =
                validBlocks.length > 0
                    ? {
                          text: fullText,
                          blocks: validBlocks.map((b, i) => ({
                              id: b.id || `b-${i}`,
                              title: b.title.trim() || `Окно ${i + 1}`,
                              mode: b.mode,
                              text: b.text,
                          })),
                      }
                    : undefined;

            await updateBox(id, {
                title: trimmed,
                description: description.trim() || undefined,
                price: Math.max(0, Math.floor(Number(price) || 0)),
                currency: "stella",
                rarity: isCanSelectRarity ? rarity : undefined,
                is_public: isPublic,
                content: contentPayload,
            });

            // Загружаем новые выбранные медиафайлы
            for (const file of stagedFiles) {
                await uploadBoxAsset(id, file);
            }

            setSaving(false);
            setSuccessMessage("Изменения успешно сохранены!");
            setTimeout(() => {
                navigate(`/box/instance/${id}`);
            }, 1200);
        } catch (err) {
            setSaving(false);
            setError(uploadErrorMessage(err));
        }
    };

    if (loading) {
        return (
            <div className="create-box-page">
                <div style={{ color: "#888", textAlign: "center", padding: "40px 0" }}>Загрузка параметров...</div>
            </div>
        );
    }

    if (!box || !box.template) {
        return (
            <div className="create-box-page">
                <div style={{ color: "#ff5555", textAlign: "center", padding: "40px 0" }}>
                    Коробка не найдена или у вас нет доступа к редактированию
                </div>
            </div>
        );
    }

    const { rarityGlow: glow, boxColor } = resolveRarityVisual(rarity);
    const authorNickname = box.template.owner_username || user?.username || "Автор";

    const previewBlocks: BoxContentBlock[] = blocks
        .filter((b) => b.text.trim().length > 0 || b.title.trim().length > 0)
        .map((b, i) => ({
            id: b.id || `preview-${i}`,
            title: b.title.trim() || `Окно ${i + 1}`,
            mode: b.mode,
            text: b.text,
        }));

    const previewContent: BoxContent | undefined =
        previewBlocks.length > 0
            ? {
                  text: previewBlocks.map((b) => b.text).join("\n\n"),
                  blocks: previewBlocks,
              }
            : undefined;

    return (
        <div className="create-box-page">
            <div className="create-box-head">
                <Link to={`/box/instance/${id}`} className="create-box-back-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent)", textDecoration: "none", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>
                    ← Назад к коробке
                </Link>
                <h1 className="create-box-title">Редактирование коробки</h1>
                <p className="create-box-sub">
                    Измените параметры, назовите окна контента и настройте редкость вашей цифровой коробки.
                </p>
            </div>

            <div className="create-box-split-layout">
                {/* ── ЛЕВАЯ КОЛОНКА: ИНТЕРАКТИВНЫЙ ПРЕДПРОСМОТР ── */}
                <aside className="create-box-preview-side">
                    <span className="create-preview-badge">Предпросмотр</span>
                    <div className="create-preview-card">
                        <div className="create-preview-wireframe-wrap">
                            <WireframeBox
                                size={140}
                                rarityGlow={glow}
                                color={boxColor}
                                contentType={resolveBoxContentType(box)}
                            />
                        </div>

                        <div className="create-preview-meta">
                            <span className="create-preview-rarity" style={{ color: boxColor }}>
                                {rarity.toUpperCase()}
                            </span>
                            <h3 className="create-preview-title">{title || "Название коробки"}</h3>
                            <p className="create-preview-desc">
                                {description || "Описание цифрового артефакта"}
                            </p>

                            <div className="create-preview-author">
                                <Avatar url={box.template?.owner_avatar_url || (user as any)?.avatar_url} name={authorNickname} size={34} />
                                <div className="author-info">
                                    <span className="author-name">{authorNickname}</span>
                                    <span className="author-role">Автор коробки</span>
                                </div>
                            </div>
                        </div>

                        {/* Предпросмотр всех окон */}
                        {previewContent && (
                            <div className="create-preview-inspector-wrap" style={{ marginTop: "12px" }}>
                                <SmartContentInspector
                                    content={previewContent.text || undefined}
                                    rawContent={previewContent}
                                    boxTitle={title || "Окно"}
                                />
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── ПРАВАЯ КОЛОНКА: ФОРМА РЕДАКТИРОВАНИЯ ── */}
                <form className="create-box-form" onSubmit={handleSave}>
                    {error && <div className="create-box-alert error">{error}</div>}
                    {successMessage && <div className="create-box-alert success">{successMessage}</div>}

                    <label className="create-box-field">
                        <span className="create-box-label">Название коробки</span>
                        <input
                            type="text"
                            className="create-box-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Например: Алгоритмы Графов v2"
                            maxLength={100}
                            required
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
                                onChange={(val: string) => setIsPublic(val as "public" | "private")}
                                ariaLabel="Доступность"
                            />
                        </div>

                        {/* ВЫБОР РЕДКОСТИ ДЛЯ УПОЛНОМОЧЕННЫХ ПОЛЬЗОВАТЕЛЕЙ */}
                        {isCanSelectRarity && (
                            <div className="create-box-field">
                                <span className="create-box-label">Редкость коробки</span>
                                <Select
                                    value={rarity}
                                    options={RARITY_OPTIONS}
                                    onChange={(val: string) => setRarity(val)}
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
                                disabled={saving}
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
                                        disabled={saving}
                                    />

                                    <div className="create-box-block-mode-select">
                                        <Select
                                            value={block.mode}
                                            options={MODE_OPTIONS}
                                            onChange={(val: string) => updateBlock(block.id, { mode: val as "code" | "text" | "todo" })}
                                            ariaLabel="Режим отображения"
                                        />
                                    </div>

                                    {blocks.length > 1 && (
                                        <button
                                            type="button"
                                            className="create-box-block-remove-btn"
                                            onClick={() => removeBlock(block.id)}
                                            disabled={saving}
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
                                    disabled={saving}
                                />
                            </div>
                        ))}
                    </div>

                    {/* ── УПРАВЛЕНИЕ АССЕТАМИ И ФАЙЛАМИ ── */}
                    <div className="create-box-field">
                        <span className="create-box-label">Прикрепить файлы и картинки</span>
                        {assets.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                                {assets.map((asset) => (
                                    <div key={asset.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface-hover)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                                        <span style={{ fontSize: "13px", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.original_name}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteAsset(asset.id)}
                                            style={{ background: "rgba(255, 85, 85, 0.15)", color: "#ff5555", border: "1px solid rgba(255, 85, 85, 0.3)", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label className="create-box-file-add">
                            <input
                                type="file"
                                multiple
                                hidden
                                accept="image/*,video/*,.py,.js,.ts,.tsx,.jsx,.cpp,.c,.h,.cs,.java,.json,.md,.txt,.html,.css,.latex,.tex,.sql,.sh,.yaml,.yml"
                                onChange={handleFilePick}
                                disabled={saving}
                            />
                            + Загрузить картинку, видео или файл кода (.py/.md/.txt)
                        </label>
                    </div>

                    {stagedFiles.length > 0 && (
                        <div style={{ fontSize: "12px", color: "var(--accent)" }}>
                            Выбрано файлов для загрузки: {stagedFiles.length}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                        <button
                            type="submit"
                            className="create-box-submit-btn"
                            disabled={saving}
                        >
                            {saving ? "Сохранение..." : "Сохранить изменения"}
                        </button>
                        <button
                            type="button"
                            className="create-box-cancel-btn"
                            style={{ padding: "12px 20px", borderRadius: "8px", background: "var(--surface-hover)", border: "1px solid var(--border-subtle)", color: "var(--ink)", cursor: "pointer", fontWeight: "600" }}
                            onClick={() => navigate(`/box/instance/${id}`)}
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
