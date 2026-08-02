import React, { useId } from "react";
import "./StellaCoinIcon.css";

interface StellacoinIconProps {
    size?: number;
    className?: string;
}

export const StellacoinIcon: React.FC<StellacoinIconProps> = ({
    size = 18,
    className = "",
}) => {
    const rawId = useId();
    const bgId = `stellaBg_${rawId.replace(/:/g, "_")}`;
    const rimId = `stellaRim_${rawId.replace(/:/g, "_")}`;
    const symbolId = `stellaSymbol_${rawId.replace(/:/g, "_")}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`stellacoin-icon ${className}`}
            style={{ width: size, height: size, flexShrink: 0 }}
            aria-label="Stellacoin"
        >
            <defs>
                {/* Coin Base Gradient - Brand Mint/Teal overlay */}
                <linearGradient id={bgId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4FA98E" />
                    <stop offset="60%" stopColor="#2F7A65" />
                    <stop offset="100%" stopColor="#1B4D3F" />
                </linearGradient>

                {/* Metallic Highlight Outer Rim */}
                <linearGradient id={rimId} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#A7F3D0" />
                    <stop offset="45%" stopColor="#4FA98E" />
                    <stop offset="100%" stopColor="#143A30" />
                </linearGradient>

                {/* Center Symbol Crisp White-Mint Gradient */}
                <linearGradient id={symbolId} x1="8" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#D1FAE5" />
                </linearGradient>
            </defs>

            {/* Coin Outer Base Circle */}
            <circle cx="16" cy="16" r="14" fill={`url(#${bgId})`} stroke={`url(#${rimId})`} strokeWidth="1.5" />

            {/* Inner Minted Bezel Ring */}
            <circle cx="16" cy="16" r="11.5" stroke="#6EE7B7" strokeOpacity="0.4" strokeWidth="0.8" strokeDasharray="3 1.5" />

            {/* Center Emblem: Clean Stylized Vector 'S' */}
            <path
                d="M19.5 10.5C18.8 9.6 17.6 9 16 9C13.2 9 11.5 10.8 11.5 12.8C11.5 17 20.5 15 20.5 19.2C20.5 21.4 18.6 23 16 23C14 23 12.5 22.1 11.5 20.8"
                stroke={`url(#${symbolId})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export const StellaCoinIcon = StellacoinIcon;
