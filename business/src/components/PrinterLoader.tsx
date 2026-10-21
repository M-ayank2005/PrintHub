import React from 'react';
import { Printer } from 'lucide-react';

interface PrinterLoaderProps {
  message?: string;
}

export const PrinterLoader: React.FC<PrinterLoaderProps> = ({
  message = 'Initializing print spooler & cloud gateway...',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app, #0b0f19)',
        color: 'var(--text-primary, #f8fafc)',
        userSelect: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 99999,
        transition: 'background-color 0.25s ease',
      }}
    >
      <style>{`
        @keyframes iconGlowPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 14px 36px var(--accent-indigo-glow, rgba(99, 102, 241, 0.35)), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 20px 48px var(--accent-indigo-glow, rgba(99, 102, 241, 0.55)), 0 0 0 1px rgba(255, 255, 255, 0.25) inset;
          }
        }

        @keyframes ringSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes textBreathe {
          0%, 100% {
            opacity: 0.75;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      {/* Central App Icon */}
      <div
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #4338ca 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          animation: 'iconGlowPulse 2.8s ease-in-out infinite',
          marginBottom: '20px',
        }}
      >
        <Printer size={38} strokeWidth={2.2} />
      </div>

      {/* Brand Title & Subtitle */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary, #f8fafc)',
            marginBottom: '4px',
          }}
        >
          PrintHub Business
        </h1>
        <p
          style={{
            fontSize: '0.86rem',
            color: 'var(--text-secondary, #94a3b8)',
            fontWeight: 500,
          }}
        >
          Desktop Agent & Control Center
        </p>
      </div>

      {/* Central Spinner & Status */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '3px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
            borderTopColor: 'var(--accent-indigo, #6366f1)',
            borderRightColor: 'var(--accent-indigo, #6366f1)',
            animation: 'ringSpin 0.75s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite',
          }}
        />

        <div
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary, #94a3b8)',
            fontWeight: 500,
            animation: 'textBreathe 2s ease-in-out infinite',
            letterSpacing: '-0.01em',
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
};
