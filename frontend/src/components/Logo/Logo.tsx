import "../../pages/Auth/Auth.css"

export const Logo = ({ size = 60, className }: { size?: number, className?: string }) => (
    <svg 
        width={size * 1.2} // Умеренная ширина
        height={size} 
        viewBox="0 0 120 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Основные стойки стеллажа */}
        <rect x="10" y="10" width="5" height="80" rx="2.5" fill="currentColor" />
        <rect x="105" y="10" width="5" height="80" rx="2.5" fill="currentColor" />
        
        {/* Горизонтальные полки */}
        <rect x="10" y="30" width="100" height="3" rx="1.5" fill="currentColor" />
        <rect x="10" y="55" width="100" height="3" rx="1.5" fill="currentColor" />
        <rect x="10" y="80" width="100" height="3" rx="1.5" fill="currentColor" />

        {/* Коробки (контуры) */}
        <g stroke="currentColor" strokeWidth="2.5" fill="none">
            {/* Верхняя полка */}
            <rect x="22" y="18" width="38" height="12" rx="2" />
            <rect x="70" y="15" width="22" height="15" rx="2" />
            
            {/* Средняя полка */}
            <rect x="18" y="45" width="22" height="10" rx="2" />
            <rect x="48" y="38" width="22" height="17" rx="2" />
            <rect x="78" y="45" width="18" height="10" rx="2" />
            
            {/* Нижняя полка */}
            <rect x="22" y="65" width="55" height="15" rx="2" />
            <rect x="85" y="70" width="12" height="10" rx="2" />
        </g>
    </svg>
);