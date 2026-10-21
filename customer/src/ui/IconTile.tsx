'use client';

import React from 'react';

interface IconTileProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accentColor?: string;
  bgColor?: string;
  borderColor?: string;
}

export const IconTile: React.FC<IconTileProps> = ({
  icon,
  label,
  onClick,
  accentColor = '#4f46e5',
  bgColor = '#eef2ff',
  borderColor = 'rgba(99, 102, 241, 0.2)',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-interactive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px 6px',
        textAlign: 'center',
        minHeight: '80px',
        borderRadius: '18px',
        border: `1.5px solid ${borderColor}`,
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.15s var(--ease-spring), box-shadow 0.15s ease',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: bgColor,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </button>
  );
};
