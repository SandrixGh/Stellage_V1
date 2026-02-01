import { useState } from "react"
import { useAuthStore } from "../../store/useAuthStore";
import './Auth.css';
import { AuthCard } from "../../components/Auth/AuthCard";
import { AuthForm } from "../../components/Auth/AuthForm";

export const LoginPage = ({ onSwitch }: { onSwitch: () => void }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const login = useAuthStore((state) => state.login)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            await login(email, password);
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Произошла ошибка при входе'
            setError(message)
        }
    }

    return (
        <AuthCard 
            title="Вход в Stellage"
            footer={
                <>Ещё нет аккаунта? 
                    <span className="auth-link" onClick={onSwitch}>
                        Зарегистрироваться
                    </span>
                </>
            }
        >
            {error && <div className="error-message">{error}</div>}
            <AuthForm
                onSubmit={handleSubmit}
                emailData={{field: email, setField: setEmail, label: "Email", type: "email",}}
                passwordData={{field: password, setField: setPassword, label: "Пароль", type: "password",}}
                buttonContent="Войти"
            />
        </AuthCard>
    )
}