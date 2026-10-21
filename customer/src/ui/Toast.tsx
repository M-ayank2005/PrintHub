'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Portal } from './Portal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Portal>
        <div
          role="region"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: 'calc(100% - 32px)',
            maxWidth: '420px',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((toast) => {
            const isError = toast.type === 'error';
            const isSuccess = toast.type === 'success';

            return (
              <div
                key={toast.id}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: isError ? '#fff1f2' : isSuccess ? '#ecfdf5' : '#ffffff',
                  border: `1.5px solid ${isError ? '#fecdd3' : isSuccess ? '#a7f3d0' : '#e2e8f0'}`,
                  color: isError ? '#9f1239' : isSuccess ? '#065f46' : 'var(--text-main)',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  animation: 'fadeInScale 0.2s var(--ease-spring)',
                }}
              >
                {isError ? (
                  <AlertCircle size={18} color="#e11d48" style={{ flexShrink: 0 }} />
                ) : isSuccess ? (
                  <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
                ) : (
                  <Info size={18} color="#4f46e5" style={{ flexShrink: 0 }} />
                )}

                <span style={{ flex: 1, lineHeight: 1.35 }}>{toast.message}</span>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss notification"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    opacity: 0.65,
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg: string) => {
        console.warn('Toast:', msg);
      },
    };
  }
  return context;
};
