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
      className="printer-loader-splash"
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        zIndex: 999999,
        userSelect: 'none',
        margin: 0,
        padding: '24px',
        boxSizing: 'border-box',
        transition: 'background-color 0.25s ease',
      }}
    >
      <style>{`
        .printer-loader-splash {
          background-color: var(--bg-app, #0b0f19);
          color: var(--text-primary, #f8fafc);
        }
        [data-theme='light'] .printer-loader-splash {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }
        [data-theme='dark'] .printer-loader-splash {
          background-color: #0b0f19 !important;
          color: #f8fafc !important;
        }

        .printer-loader-text-primary {
          color: var(--text-primary, #f8fafc);
        }
        [data-theme='light'] .printer-loader-text-primary {
          color: #0f172a !important;
        }
        [data-theme='dark'] .printer-loader-text-primary {
          color: #f8fafc !important;
        }

        .printer-loader-text-secondary {
          color: var(--text-secondary, #94a3b8);
        }
        [data-theme='light'] .printer-loader-text-secondary {
          color: #475569 !important;
        }
        [data-theme='dark'] .printer-loader-text-secondary {
          color: #94a3b8 !important;
        }

        @keyframes iconGlowPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 14px 36px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 20px 48px rgba(99, 102, 241, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.25) inset;
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

      {/* Perfectly Centered Content Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          margin: 'auto',
          maxWidth: '480px',
          width: '100%',
        }}
      >
        {/* Central App Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #4338ca 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            animation: 'iconGlowPulse 2.8s ease-in-out infinite',
            marginBottom: '22px',
          }}
        >
          <Printer size={40} strokeWidth={2.2} />
        </div>

        {/* Brand Title & Subtitle */}
        <div style={{ marginBottom: '28px' }}>
          <h1
            className="printer-loader-text-primary"
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              marginBottom: '4px',
            }}
          >
            PrintHub Business
          </h1>
          <p
            className="printer-loader-text-secondary"
            style={{
              fontSize: '0.88rem',
              fontWeight: 500,
            }}
          >
            Desktop Agent &amp; Control Center
          </p>
        </div>

        {/* Central Spinner & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '3px solid rgba(99, 102, 241, 0.18)',
              borderTopColor: '#6366f1',
              borderRightColor: '#6366f1',
              animation: 'ringSpin 0.75s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite',
            }}
          />

          <div
            className="printer-loader-text-secondary"
            style={{
              fontSize: '0.82rem',
              fontWeight: 500,
              animation: 'textBreathe 2s ease-in-out infinite',
              letterSpacing: '-0.01em',
            }}
          >
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};
