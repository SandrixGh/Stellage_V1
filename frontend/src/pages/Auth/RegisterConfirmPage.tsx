import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/instance";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import "./Auth.css";

type State = "loading" | "success" | "error";

export const RegisterConfirmPage = () => {
    const [searchParams] = useSearchParams();
    const [state, setState] = useState<State>("loading");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setState("error");
            setErrorMsg("Токен подтверждения отсутствует в ссылке.");
            return;
        }

        api.get("/auth/register_confirm/", { params: { token } })
            .then(() => setState("success"))
            .catch((err) => {
                setErrorMsg(err.response?.data?.detail || "Ссылка недействительна или истекла.");
                setState("error");
            });
    }, [searchParams]);

    return (
        <AuthLayout>
            <div className="auth-card">
                {state === "loading" && (
                    <>
                        <h2>Подтверждение...</h2>
                        <p className="success-message">Проверяем вашу ссылку.</p>
                        <div className="auth-spinner-wrapper">
                            <div className="btn-spinner" />
                        </div>
                    </>
                )}

                {state === "success" && (
                    <>
                        <h2>Готово!</h2>
                        <p className="success-message">Аккаунт подтверждён. Теперь можно войти.</p>
                        <Link className="btn-primary" to="/login">
                            Войти
                        </Link>
                    </>
                )}

                {state === "error" && (
                    <>
                        <h2>Ошибка</h2>
                        <div className="error-message">{errorMsg}</div>
                        <Link className="btn-primary" to="/register">
                            Зарегистрироваться снова
                        </Link>
                    </>
                )}
            </div>
        </AuthLayout>
    );
};
