import React from "react";
import "./DeveloperBadge.css";

interface DeveloperBadgeProps {
    size?: "sm" | "md";
    className?: string;
    showLabel?: boolean;
}

export const DeveloperBadge: React.FC<DeveloperBadgeProps> = ({
    size = "md",
    className = "",
    showLabel = true,
}) => {
    return (
        <span
            className={`stellage-developer-badge stellage-developer-badge--${size} ${className}`}
            title="Официальный разработчик платформы Stellage"
            aria-label="Stellage Developer"
        >
            <svg
                className="stellage-developer-badge__icon"
                width={size === "sm" ? "12" : "14"}
                height={size === "sm" ? "12" : "14"}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
            {showLabel && (
                <span className="stellage-developer-badge__text">
                    Stellage Developer
                </span>
            )}
        </span>
    );
};
