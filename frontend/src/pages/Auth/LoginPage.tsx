import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
    const [searchParams] = useSearchParams();
    // Режим «добавить аккаунт»: вход, не выходя из текущего. Бэкенд добавляет
    // новый аккаунт в реестр устройства (старые сессии не трогает), новый
    // становится активным — после входа ведём в Настройки к списку аккаунтов.
    const isAdding = searchParams.get("add") === "1";
    const login = useAuthStore((state) => state.login)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await login(email, password);
            navigate(isAdding ? "/settings" : "/");
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
                title={isAdding ? "Добавить аккаунт" : "Вход"}
                footer={
                    isAdding ? (
                        <>Вход в другой аккаунт — текущий останется на устройстве.</>
                    ) : (
                        <>Ещё нет аккаунта?
                            <Link className="auth-link" to="/register">
                                Зарегистрироваться
                            </Link>
                        </>
                    )
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
