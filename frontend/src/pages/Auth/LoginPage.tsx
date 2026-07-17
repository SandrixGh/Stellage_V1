import { useState } from "react"
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import './Auth.css';
import { AuthCard } from "../../components/Auth/AuthCard";
import { AuthForm } from "../../components/Auth/AuthForm";
import { AuthLayout } from "../../components/Auth/AuthLayout";

export const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await login(email, password);
            navigate("/");
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Произошла ошибка при входе'
            setError(message)
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AuthLayout>
            <AuthCard
                title="Вход"
                footer={
                    <>Ещё нет аккаунта?
                        <Link className="auth-link" to="/register">
                            Зарегистрироваться
                        </Link>
                    </>
                }
            >
                {error && <div className="error-message">{error}</div>}
                <AuthForm
                    onSubmit={handleSubmit}
                    emailData={{ field: email, setField: setEmail, label: "Email", type: "email" }}
                    passwordData={{ field: password, setField: setPassword, label: "Пароль", type: "password" }}
                    buttonContent="Войти"
                    isLoading={isLoading}
                />
            </AuthCard>
        </AuthLayout>
    )
}
