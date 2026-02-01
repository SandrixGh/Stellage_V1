import type { AuthCardProps } from "../../types/Auth/AuthCard";
import "../../pages/Auth/Auth.css"

export const AuthCard = ({title, children, footer}: AuthCardProps) => {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>{title}</h2>
                {children}
                {footer && <div className="auth-footer">{footer}</div>}
            </div>
        </div>
    )
}