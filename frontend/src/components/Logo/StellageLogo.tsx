import React from 'react';
import logoImage from './RIGHT-STELLAGE-LOGO-1-NOBG.png';

interface StellageLogoProps {
  size?: number | string;
  color?: string;
  className?: string;
}

export const StellageLogo: React.FC<StellageLogoProps> = ({
  size = 100,
  color,
  className
}) => {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={logoImage}
      alt="Stellage Logo"
      className={className}
      style={{
        width: sizeValue,
        height: sizeValue,
        display: 'inline-block',
        flexShrink: 0,
        objectFit: 'contain'
      }}
    />
  );
};
