import React from 'react';
import logoImage from './RIGHT-STELLAGE-LOGO-1-NOBG.png';

interface StellageLogoProps {
  size?: number | string;
  color?: string;
  className?: string;
}

export const StellageLogo: React.FC<StellageLogoProps> = ({
  size = 100,
  className
}) => {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={logoImage}
      alt="Stellage Logo"
      className={className}
      style={{
        // Drive height from `size`; width follows the asset's real
        // aspect ratio so the mark is never squished into a square.
        height: sizeValue,
        width: 'auto',
        display: 'inline-block',
        flexShrink: 0,
        objectFit: 'contain'
      }}
    />
  );
};
