'use client';

import React from 'react';

interface StatusPillProps {
  status: 'online' | 'offline' | 'pending' | 'success' | 'danger';
  children: React.ReactNode;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, children }) => {
  const getStyles = () => {
    switch (status) {
      case 'online':
      case 'success':
        return {
          background: '#ecfdf5',
          color: '#059669',
          border: '1px solid rgba(5, 150, 105, 0.2)',
          dotColor: '#059669',
        };
      case 'offline':
      case 'danger':
        return {
          background: '#fff1f2',
          color: '#e11d48',
          border: '1px solid rgba(225, 29, 72, 0.2)',
          dotColor: '#e11d48',
        };
      case 'pending':
      default:
        return {
          background: '#eff6ff',
          color: '#2563eb',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          dotColor: '#2563eb',
        };
    }
  };

  const styleConfig = getStyles();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.74rem',
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: '8px',
        lineHeight: 1.2,
        background: styleConfig.background,
        color: styleConfig.color,
        border: styleConfig.border,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: styleConfig.dotColor,
          display: 'inline-block',
        }}
      />
      <span>{children}</span>
    </span>
  );
};
