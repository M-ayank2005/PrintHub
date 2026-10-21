'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  ariaLabel?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  min = 1,
  max = 99,
  onChange,
  ariaLabel = 'Quantity',
}) => {
  const handleDecrement = () => {
    if (value > min) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(10); } catch (e) {}
      }
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(10); } catch (e) {}
      }
      onChange(value + 1);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Decrease"
        className="stepper-btn"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: value <= min ? 'not-allowed' : 'pointer',
          opacity: value <= min ? 0.35 : 1,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Minus size={15} />
      </button>

      <span
        style={{
          fontSize: '1.05rem',
          fontWeight: 800,
          minWidth: '28px',
          textAlign: 'center',
          color: 'var(--text-main)',
        }}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Increase"
        className="stepper-btn"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          opacity: value >= max ? 0.35 : 1,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Plus size={15} />
      </button>
    </div>
  );
};
