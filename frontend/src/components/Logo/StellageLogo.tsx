import React from 'react';
import logoImage from './RIGHT-STELLAGE-LOGO-1-NOBG.png';

interface StellageLogoProps {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * Знак Stellage (сплетённые кубы). Исходник — одноцветный PNG на прозрачном фоне,
 * поэтому перекрашиваем его CSS-маской: PNG задаёт форму (альфу), цвет даёт заливка.
 * По умолчанию — фирменный зелёный (--accent), сам адаптируется под тему. Соотношение
 * сторон исходника (~877×817) держим через aspect-ratio, чтобы знак не сплющивало.
 */
export const StellageLogo: React.FC<StellageLogoProps> = ({
  size = 100,
  color = 'var(--accent)',
  className,
}) => {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <span
      role="img"
      aria-label="Stellage"
      className={className}
      style={{
        display: 'inline-block',
        flexShrink: 0,
        height: sizeValue,
        width: 'auto',
        aspectRatio: '877 / 817',
        backgroundColor: color,
        WebkitMaskImage: `url(${logoImage})`,
        maskImage: `url(${logoImage})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
};
