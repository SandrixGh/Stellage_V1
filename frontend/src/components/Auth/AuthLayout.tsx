import type { AuthLayoutProps } from "../../types/Auth/AuthLayout";
import "../../pages/Auth/Auth.css"
import { Logo } from "../Logo/Logo";

export const AuthLayout = ({ children }: AuthLayoutProps) => {
    return (
        <div className="auth-container">
            <div className="auth-content-wrapper">
                <div className="app-title-wrapper">
                    <Logo size={60} />
                    <h1 className="app-name">Stellage</h1>
                </div>
                {children}
            </div>
        </div>
    )
}