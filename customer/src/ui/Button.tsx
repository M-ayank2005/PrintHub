'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  style,
  className = '',
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          background: '#ffffff',
          color: 'var(--text-main)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-muted)',
          border: 'none',
        };
      case 'primary':
      default:
        return {
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(79, 70, 229, 0.32)',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '8px 14px',
          minHeight: '38px',
          fontSize: '0.82rem',
          borderRadius: 'var(--radius-sm)',
        };
      case 'lg':
        return {
          padding: '16px 24px',
          minHeight: '52px',
          fontSize: '1.02rem',
          borderRadius: 'var(--radius-md)',
        };
      case 'md':
      default:
        return {
          padding: '12px 18px',
          minHeight: '46px',
          fontSize: '0.92rem',
          borderRadius: 'var(--radius-md)',
        };
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 700,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'transform 0.15s var(--ease-spring), box-shadow 0.15s ease',
        userSelect: 'none',
        textDecoration: 'none',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      className={`btn-interactive ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
      {children}
    </button>
  );
};
