import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/instance";
import './Auth.css';
import { AuthForm } from "../../components/Auth/AuthForm";
import { AuthCard } from "../../components/Auth/AuthCard";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import { validateInviteCodeApi } from "../../api/invites";
import { useAuthStore } from "../../store/useAuthStore";

export const RegisterPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const login = useAuthStore((state) => state.login);

    const [inviteCode, setInviteCode] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [inviteNotice, setInviteNotice] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    /* 
    // Для включения окна с просьбой проверить почту в будущем раскомментируйте этот блок и setIsSent(true) в handleSubmit:
    const [isSent, setIsSent] = useState(false);
    if (isSent) {
        return (
            <AuthLayout>
                <div className="auth-card">
                    <h2>Проверьте почту</h2>
                    <p className="success-message">
                        Мы отправили письмо на <strong>{email}</strong> для подтверждения аккаунта.
                    </p>
                    <button onClick={() => navigate("/login")} className="btn-primary" style={{ marginTop: '20px' }}>
                        К логину
                    </button>
                </div>
            </AuthLayout>
        );
    }
    */

    useEffect(() => {
        const queryInvite = searchParams.get("invite");
        if (queryInvite) {
            setInviteCode(queryInvite.trim().toUpperCase());
            validateInviteCodeApi(queryInvite.trim()).then((res) => {
                if (res.is_valid && res.inviter_nickname) {
                    setInviteNotice(`Приглашение от ${res.inviter_nickname}`);
                }
            }).catch(() => {});
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!inviteCode.trim()) {
            setError("Регистрация доступна только по инвайт-коду");
            return;
        }

        setIsLoading(true);
        try {
            const payload: { email: string; password: string; username?: string; invite_code: string } = {
                email,
                password,
                invite_code: inviteCode.trim().toUpperCase(),
            };
            if (username.trim()) payload.username = username.trim();

            await api.post("/auth/register/", payload);

            // Мгновенная автоматическая авторизация пользователя без показа лишних окон
            await login(email, password);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Ошибка при регистрации. Проверьте инвайт-код.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <AuthCard
                title="Регистрация по приглашению"
                footer={
                    <>Уже есть аккаунт?
                        <Link className="auth-link" to="/login"> Войти</Link>
                    </>
                }
            >
                {inviteNotice && (
                    <div style={{
                        padding: '10px 14px',
                        marginBottom: '16px',
                        borderRadius: '8px',
                        background: 'rgba(79, 169, 142, 0.12)',
                        border: '1px solid var(--accent, #4FA98E)',
                        color: 'var(--accent, #4FA98E)',
                        fontSize: '0.9rem',
                        fontWeight: 500
                    }}>
                        ✨ {inviteNotice}
                    </div>
                )}
                {error && <div className="error-message">{error}</div>}
                <AuthForm
                    onSubmit={handleSubmit}
                    inviteCodeData={{
                        field: inviteCode,
                        setField: setInviteCode,
                        label: "Код приглашения (Invite Code) *",
                        type: "text"
                    }}
                    usernameData={{
                        field: username,
                        setField: setUsername,
                        label: "Имя пользователя",
                        type: "text"
                    }}
                    emailData={{ field: email, setField: setEmail, label: "Email", type: "email" }}
                    passwordData={{ field: password, setField: setPassword, label: "Пароль", type: "password" }}
                    buttonContent="Зарегистрироваться"
                    isLoading={isLoading}
                />
            </AuthCard>
        </AuthLayout>
    );
};
