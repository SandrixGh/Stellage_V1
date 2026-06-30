import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useStellageStore } from "../../store/useStellageStore";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import "./CreateBoxPage.css";

const CURRENCIES = ["RUB", "USD", "EUR", "GBP", "CNY", "JPY", "KZT", "BYN", "TRY"];

export const CreateBoxPage = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const createBox = useStellageStore((s) => s.createBox);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0");
    const [currency, setCurrency] = useState("RUB");
    const [content, setContent] = useState("");
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = title.trim();
        if (trimmed.length < 1 || saving) return;
        setSaving(true);
        setError(null);

        const text = content.trim();
        const box = await createBox({
            title: trimmed,
            description: description.trim() || undefined,
            price: Number(price) || 0,
            currency,
            content: text ? { text } : undefined,
        });

        setSaving(false);
        if (box) {
            navigate("/inventory");
        } else {
            setError("Не удалось создать коробку. Попробуйте позже.");
        }
    };

    return (
        <section className="create-box-page">
            <header className="create-box-head">
                <div className="create-box-visual">
                    <WireframeBox size={130} />
                </div>
                <div>
                    <h1 className="create-box-title">Создать коробку</h1>
                    <p className="create-box-sub">
                        Новая коробка попадёт в твой инвентарь. Редкость — Common.
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
                        />
                    </label>
                    <label className="create-box-field">
                        <span className="create-box-label">Валюта</span>
                        <select
                            className="create-box-input"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className="create-box-field">
                    <span className="create-box-label">Содержимое</span>
                    <textarea
                        className="create-box-input create-box-textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Текст, ссылка или заметка (полноценное хранилище появится позже)"
                        rows={4}
                    />
                </label>

                {error && <p className="create-box-error">{error}</p>}

                <div className="create-box-actions">
                    <Link to="/inventory" className="create-box-btn ghost">Отмена</Link>
                    <button
                        type="submit"
                        className="create-box-btn primary"
                        disabled={saving || title.trim().length < 1}
                    >
                        {saving ? "Создание…" : "Создать коробку"}
                    </button>
                </div>
            </form>
        </section>
    );
};
