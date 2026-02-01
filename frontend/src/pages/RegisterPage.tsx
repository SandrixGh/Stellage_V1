import { useState } from "react"
import { api } from "../api/instance";
import './Auth.css';
import { AuthForm } from "../components/Auth/AuthForm";
import type { AuthInputProps } from "../types/Auth/AuthInput";
import { AuthCard } from "../components/Auth/AuthCard";

export const RegisterPage = ({ onSwitch }: { onSwitch: () => void }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            await api.post("/auth/register/", { email, password })
            setIsSent(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Ошибка  при регистрации");
        }
    };

    if (isSent) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2>Проверьте почту</h2>
                    <div className="success-message">
                        Мы отправили письмо на <strong>{email}</strong> для подтверждения аккаунта.
                    </div>
                    <button
                        onClick={onSwitch}
                        className="btn-primary"
                    >
                        К логину
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AuthCard
            title="Регистрация в Stellage"
            footer={
                <>Ещё нет аккаунта? 
                    <span className="auth-link" onClick={onSwitch}>
                        Войти
                    </span>
                </>
            }
        >
            {error && <div className="error-message">{error}</div>}
            <AuthForm
                onSubmit={handleSubmit}
                emailData={{ field: email, setField: setEmail, label: "email", type: "email", }}
                passwordData={{ field: password, setField: setPassword, label: "password", type: "password", }}
                buttonContent="Войти"
            />
        </AuthCard>
    )
}