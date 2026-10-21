'use client';

import React, { useId } from 'react';
import { motion } from 'framer-motion';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  name?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  name,
}: SegmentedProps<T>) {
  const generatedId = useId();
  const groupId = name || generatedId;

  return (
    <div
      role="radiogroup"
      className="segment-container"
      style={{
        display: 'flex',
        background: '#f1f5f9',
        borderRadius: '14px',
        padding: '4px',
        border: '1px solid #e2e8f0',
        position: 'relative',
        minHeight: size === 'sm' ? '36px' : '42px',
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={opt.disabled}
            title={opt.disabled && opt.disabledReason ? opt.disabledReason : undefined}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className="segment-btn"
            style={{
              flex: 1,
              position: 'relative',
              background: 'transparent',
              border: 'none',
              padding: size === 'sm' ? '6px 8px' : '8px 10px',
              fontSize: size === 'sm' ? '0.78rem' : '0.84rem',
              fontWeight: isActive ? 800 : 600,
              color: opt.disabled
                ? '#94a3b8'
                : isActive
                ? 'var(--accent-primary)'
                : 'var(--text-muted)',
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              transition: 'color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {isActive && (
              <motion.div
                layoutId={`segmented-thumb-${groupId}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
                  zIndex: 1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 2 }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
