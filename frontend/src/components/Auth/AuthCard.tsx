import { useEffect, useRef } from "react";
import type { AuthCardProps } from "../../types/Auth/AuthCard";
import "../../pages/Auth/Auth.css"

export const AuthCard = ({ title, children, footer }: AuthCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        card.style.animation = 'none';
        void card.offsetHeight;
        card.style.animation = '';
    }, [title]);

    return (
        <div className="auth-card" ref={cardRef}>
            <h2>{title}</h2>
            {children}
            {footer && <div className="auth-footer">{footer}</div>}
        </div>
    )
}