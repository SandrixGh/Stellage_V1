import { useState } from "react"
import { useAuthStore } from "../store/useAuthStore";
import './Auth.css';

export const LoginPage = () => {
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
        <div className="auth-container">
            <div className="auth-card">
                <h2 >
                    Вход в Stellage
                </h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="example@mail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Пароль</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                    >
                        Войти
                    </button>
                </form>
            </div>
        </div>
    )
}