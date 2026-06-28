import { useState } from "react"
import { api } from "../../api/instance";
import './Auth.css';
import { AuthForm } from "../../components/Auth/AuthForm";
import { AuthCard } from "../../components/Auth/AuthCard";
import { AuthLayout } from "../../components/Auth/AuthLayout";

export const RegisterPage = ({ onSwitch }: { onSwitch: () => void }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await api.post("/auth/register/", { email, password })
            setIsSent(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Ошибка при регистрации");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSent) {
        return (
            <AuthLayout>
                <div className="auth-card">
                    <h2>Проверьте почту</h2>
                    <p className="success-message">
                        Мы отправили письмо на <strong>{email}</strong> для подтверждения аккаунта.
                    </p>
                    <button onClick={onSwitch} className="btn-primary">
                        К логину
                    </button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <AuthCard
                title="Регистрация"
                footer={
                    <>Уже есть аккаунт?
                        <span className="auth-link" onClick={onSwitch}> Войти</span>
                    </>
                }
            >
                {error && <div className="error-message">{error}</div>}
                <AuthForm
                    onSubmit={handleSubmit}
                    emailData={{ field: email, setField: setEmail, label: "Email", type: "email" }}
                    passwordData={{ field: password, setField: setPassword, label: "Пароль", type: "password" }}
                    buttonContent="Зарегистрироваться"
                    isLoading={isLoading}
                />
            </AuthCard>
        </AuthLayout>
    );
}
