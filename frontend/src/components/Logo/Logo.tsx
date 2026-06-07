import React from 'react';
import logoSrc from './OFF-LOGO.png'; // Путь к вашей прозрачной PNG-картинке

interface LogoProps {
  size?: number | string;
  color?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 100,
  color = '#FFFFFF', // Сюда можно передать любой HEX, RGB или 'currentColor'
  className
}) => {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        // Картинка используется как трафарет:
        WebkitMaskImage: `url(${logoSrc})`,
        maskImage: `url(${logoSrc})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        display: 'inline-block'
      }}
    />
  );
};