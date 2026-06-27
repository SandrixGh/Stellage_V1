import React from 'react';
import logoSrc from './OFF-LOGO.png'; 

interface LogoProps {
  size?: number | string;
  color?: string; // Теперь сюда передаем ваш HEX
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 100,
  color = '#D7D0B7', // Установили ваш новый цвет по умолчанию
  className
}) => {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
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