'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  padding = 'md',
  children,
  style,
  className = '',
  ...props
}) => {
  const paddingMap = {
    none: '0',
    sm: '12px 14px',
    md: '18px 16px',
    lg: '24px 20px',
  };

  return (
    <div
      className={`glass-panel ${className}`}
      style={{
        padding: paddingMap[padding],
        background: variant === 'subtle' ? 'var(--bg-surface-subtle)' : 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
