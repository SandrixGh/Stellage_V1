interface WireframeBoxProps {
    className?: string;
    color?: string;
    size?: number;
    rarityGlow?: "rare" | "golden" | "dev" | null;
}

export const WireframeBox = ({
    className,
    color = "#D7D0B7",
    size = 120,
    rarityGlow = null,
}: WireframeBoxProps) => {
    const glowColor =
        rarityGlow === "golden"
            ? "rgba(230, 200, 120, 0.6)"
            : rarityGlow === "rare"
            ? "rgba(120, 170, 255, 0.6)"
            : rarityGlow === "dev"
            ? "rgba(200, 130, 255, 0.6)"
            : null;

    const filterId = `glow-${rarityGlow ?? "default"}`;

    return (
        <svg
            width={size}
            height={size * 0.72}
            viewBox="0 0 180 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {glowColor && (
                <defs>
                    <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feFlood floodColor={glowColor} result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
            )}

            <g filter={glowColor ? `url(#${filterId})` : undefined}>
                {/* ── Visible edges ── */}
                {/* Front face */}
                <line x1="18" y1="104" x2="18" y2="38" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                <line x1="18" y1="38" x2="118" y2="38" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                <line x1="118" y1="38" x2="118" y2="104" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                <line x1="118" y1="104" x2="18" y2="104" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                {/* Top face */}
                <line x1="18" y1="38" x2="58" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                <line x1="58" y1="8" x2="158" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                <line x1="118" y1="38" x2="158" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                {/* Right face */}
                <line x1="158" y1="8" x2="158" y2="74" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                <line x1="158" y1="74" x2="118" y2="104" stroke={color} strokeWidth="2.2" strokeLinecap="round" />

                {/* ── Hidden edges (dashed, lower opacity) ── */}
                <line x1="58" y1="8" x2="58" y2="74" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" strokeDasharray="5 3.5" />
                <line x1="18" y1="104" x2="58" y2="74" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" strokeDasharray="5 3.5" />
                <line x1="58" y1="74" x2="158" y2="74" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" strokeDasharray="5 3.5" />
            </g>
        </svg>
    );
};
