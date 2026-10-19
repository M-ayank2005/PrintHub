'use client';

import React from 'react';
import { useBusinessStore } from '../../lib/store';
import { Printer, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function PrintersPage() {
  const { printers, selectedPrinter, setSelectedPrinter } = useBusinessStore();

  const handleSetDefault = (name: string) => {
    setSelectedPrinter(name);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Printers Management
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
            Detected Windows printers on this PC. PrintHub automatically detects capabilities and routes silent print jobs to your chosen default.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {printers.map((p) => {
          const isSelected = selectedPrinter === p.name;

          return (
            <div
              key={p.name}
              className="biz-card"
              style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: isSelected ? 'rgba(99, 102, 241, 0.6)' : undefined,
                background: isSelected ? 'rgba(99, 102, 241, 0.08)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? '#818cf8' : '#94a3b8',
                  }}
                >
                  <Printer size={22} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                      {p.name}
                    </strong>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          fontWeight: 700,
                        }}
                      >
                        Default Printer
                      </span>
                    )}
                  </div>

                  {/* Capabilities badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: p.isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: p.isOnline ? '#10b981' : '#f43f5e',
                      }}
                    >
                      ● {p.isOnline ? 'Online / Ready' : 'Offline'}
                    </span>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: p.isColor ? '#06b6d4' : '#94a3b8',
                      }}
                    >
                      {p.isColor ? 'Colour Supported' : 'Monochrome Only'}
                    </span>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: p.isDuplex ? '#818cf8' : '#94a3b8',
                      }}
                    >
                      {p.isDuplex ? 'Duplex / Double-sided' : 'Single-side Only'}
                    </span>

                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Sizes: {p.paperSizes?.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {isSelected ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.88rem' }}>
                    <CheckCircle2 size={18} />
                    Active Target
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(p.name)}
                    className="biz-btn-secondary"
                  >
                    Select as Default
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
