import React from 'react';

interface PrinterLoaderProps {
  message?: string;
}

export const PrinterLoader: React.FC<PrinterLoaderProps> = ({
  message,
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
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        userSelect: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 99999,
        transition: 'background-color 0.2s ease',
      }}
    >
      <style>{`
        @keyframes printerPaperIn {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          45% {
            transform: translateY(14px);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-14px);
            opacity: 0;
          }
          65% {
            transform: translateY(-6px);
            opacity: 0.5;
          }
          85%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes printerPaperOut {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          20% {
            transform: translateY(-50%);
            opacity: 1;
          }
          65% {
            transform: translateY(4px);
            opacity: 1;
          }
          100% {
            transform: translateY(48px);
            opacity: 0;
          }
        }

        @keyframes printHeadScan {
          0% {
            left: 2px;
          }
          100% {
            left: 78px;
          }
        }

        @keyframes ledPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.35;
            transform: scale(0.85);
          }
        }

        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>

      {/* Printer Machine Illustration */}
      <div
        style={{
          position: 'relative',
          width: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Rear Paper Tray Support */}
        <div
          style={{
            width: '68px',
            height: '24px',
            background: 'var(--border-subtle)',
            borderRadius: '6px 6px 0 0',
            border: '1px solid var(--border-hover)',
            borderBottom: 'none',
            margin: '0 auto -6px auto',
          }}
        />

        {/* Paper Sheet Feeding into top slot */}
        <div
          style={{
            width: '56px',
            height: '22px',
            background: '#ffffff',
            borderRadius: '4px 4px 0 0',
            border: '1px solid #cbd5e1',
            borderBottom: 'none',
            boxShadow: '0 -2px 6px rgba(0,0,0,0.06)',
            margin: '0 auto -8px auto',
            animation: 'printerPaperIn 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            zIndex: 1,
          }}
        />

        {/* Printer Main Chassis */}
        <div
          style={{
            width: '144px',
            height: '66px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '2px solid var(--border-subtle)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.22)',
            position: 'relative',
            zIndex: 2,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top Panel with Brand Accent and Status LED */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Brand Accent Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '20px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'var(--accent-indigo)',
                }}
              />
              <div
                style={{
                  width: '6px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'var(--text-tertiary)',
                  opacity: 0.6,
                }}
              />
            </div>

            {/* Pulsing Status LED */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)',
                  display: 'inline-block',
                  animation: 'ledPulse 1.4s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Paper Output Slot with scanning print head */}
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: '#070a12',
              position: 'relative',
              overflow: 'hidden',
              margin: 'auto 0 2px 0',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Scanning Print Head / Laser beam */}
            <div
              style={{
                width: '20px',
                height: '4px',
                borderRadius: '2px',
                background: '#6366f1',
                position: 'absolute',
                top: '1px',
                boxShadow: '0 0 6px #6366f1',
                animation: 'printHeadScan 0.7s ease-in-out infinite alternate',
              }}
            />
          </div>
        </div>

        {/* Paper Ejection Area (Clipped container below printer slot) */}
        <div
          style={{
            width: '90px',
            height: '56px',
            overflow: 'hidden',
            margin: '-4px auto 0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Animated Printed Document emerging */}
          <div
            style={{
              width: '82px',
              height: '52px',
              background: '#ffffff',
              borderRadius: '0 0 6px 6px',
              margin: '0 auto',
              border: '1px solid #cbd5e1',
              borderTop: 'none',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              animation: 'printerPaperOut 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            }}
          >
            {/* Printed Header Line */}
            <div
              style={{
                width: '45%',
                height: '3px',
                borderRadius: '2px',
                background: '#4f46e5',
                marginTop: '2px',
              }}
            />
            {/* Printed Text Body Lines */}
            <div
              style={{
                width: '85%',
                height: '2px',
                borderRadius: '1px',
                background: '#94a3b8',
              }}
            />
            <div
              style={{
                width: '70%',
                height: '2px',
                borderRadius: '1px',
                background: '#94a3b8',
              }}
            />
            {/* Printed Badge / Status Line */}
            <div
              style={{
                width: '35%',
                height: '2px',
                borderRadius: '1px',
                background: '#10b981',
              }}
            />
          </div>
        </div>

        {/* Base Platform */}
        <div
          style={{
            width: '154px',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--border-subtle)',
            marginTop: '-4px',
          }}
        />
      </div>

      {/* Brand Title & Subtle Animated Dots */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <h2
          style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: message ? '6px' : '0',
          }}
        >
          PrintHub Business
        </h2>
        {message && (
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}

        {/* Three Subtle Pulsing Dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-indigo)', display: 'inline-block', animation: 'dotPulse 1.2s infinite ease-in-out', animationDelay: '0s' }} />
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-indigo)', display: 'inline-block', animation: 'dotPulse 1.2s infinite ease-in-out', animationDelay: '0.2s' }} />
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-indigo)', display: 'inline-block', animation: 'dotPulse 1.2s infinite ease-in-out', animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
};
