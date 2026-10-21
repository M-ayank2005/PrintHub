'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS = [
  { index: 1, label: 'Upload' },
  { index: 2, label: 'Details' },
  { index: 3, label: 'Payment' },
  { index: 4, label: 'Done' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <div
      role="navigation"
      aria-label="Order progress"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '8px 4px 16px 4px',
        position: 'relative',
      }}
    >
      {STEPS.map((step, idx) => {
        const isDone = currentStep > step.index;
        const isCurrent = currentStep === step.index;

        return (
          <React.Fragment key={step.index}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isDone
                    ? 'var(--accent-emerald)'
                    : isCurrent
                    ? 'var(--accent-primary)'
                    : '#f1f5f9',
                  color: isDone || isCurrent ? '#ffffff' : '#94a3b8',
                  border: isCurrent
                    ? '3px solid rgba(79, 70, 229, 0.2)'
                    : '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  transition: 'all 0.2s ease',
                  boxShadow: isCurrent ? '0 0 10px rgba(79, 70, 229, 0.3)' : 'none',
                }}
              >
                {isDone ? <Check size={14} strokeWidth={3} /> : step.index}
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: isCurrent ? 800 : 600,
                  color: isCurrent
                    ? 'var(--accent-primary)'
                    : isDone
                    ? 'var(--text-main)'
                    : '#94a3b8',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line between steps */}
            {idx < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  background: currentStep > step.index ? 'var(--accent-emerald)' : '#e2e8f0',
                  margin: '-12px 6px 0 6px',
                  zIndex: 1,
                  transition: 'background 0.3s ease',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
