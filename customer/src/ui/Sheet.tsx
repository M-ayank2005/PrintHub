'use client';

import React, { useEffect } from 'react';
import { Portal } from './Portal';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          animation: 'fadeInScale 0.18s ease-out',
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '480px',
            background: '#ffffff',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px)) 20px',
            boxShadow: '0 -15px 40px rgba(15, 23, 42, 0.25)',
            maxHeight: '90dvh',
            overflowY: 'auto',
            animation: 'fadeInScale 0.22s var(--ease-spring)',
          }}
        >
          {/* Pull indicator bar */}
          <div
            style={{
              width: '38px',
              height: '4px',
              borderRadius: '2px',
              background: '#cbd5e1',
              margin: '0 auto 16px auto',
            }}
          />

          {title && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: 'none',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}

          {children}
        </div>
      </div>
    </Portal>
  );
};
