'use client';

import React, { useEffect, useState } from 'react';
import { useBusinessStore } from '../../lib/store';
import { api } from '../../lib/api';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  FileText,
  Radio,
  Sliders,
} from 'lucide-react';

export default function PrintersPage() {
  const { printers, setPrinters, selectedPrinter, setSelectedPrinter } = useBusinessStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<Date | null>(null);

  const fetchPrinters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getSystemPrinters();
      const list = res.printers || [];
      setPrinters(list);
      setLastScanned(new Date());

      // Auto-select default printer if none or invalid
      if (list.length > 0) {
        const hasCurrent = list.some((p: any) => p.name === selectedPrinter);
        if (!hasCurrent) {
          const def = list.find((p: any) => p.isDefault) || list[0];
          setSelectedPrinter(def.name);
        }
      }
    } catch (err: any) {
      console.error('Failed to query system printers', err);
      setError(err.message || 'Unable to scan Windows spooler for connected printers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const handleSetDefault = (name: string) => {
    setSelectedPrinter(name);
  };

  const physicalPrinters = printers.filter((p) => !p.isVirtual);
  const virtualPrinters = printers.filter((p) => p.isVirtual);
  const hasNoPhysical = physicalPrinters.length === 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Printers Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Live Windows print spooler scanner. Real devices detected via Windows WMI/CIM.
            {lastScanned && ` Last scanned at ${lastScanned.toLocaleTimeString()}`}
          </p>
        </div>

        <button
          onClick={fetchPrinters}
          disabled={isLoading}
          className="biz-btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          {isLoading ? 'Scanning Windows Spooler...' : 'Scan for Printers'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            marginBottom: '20px',
            color: '#fca5a5',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={20} color="#f43f5e" />
          <span>{error}</span>
        </div>
      )}

      {/* Real Hardware Notice Banner */}
      {!isLoading && hasNoPhysical && (
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <AlertTriangle size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#fbbf24', fontSize: '0.95rem', display: 'block', marginBottom: '2px' }}>
              No External Hardware Printers Connected Currently
            </strong>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
              PrintHub scanned your Windows operating system and found no physical USB or Network printers plugged in.
              Only Windows virtual software printers (e.g. PDF/OneNote) were detected.
              Plug in your shop printer via USB or connect to your local Wi-Fi printer, then click <strong>&quot;Scan for Printers&quot;</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Printers List */}
      {printers.length === 0 && !isLoading ? (
        <div className="biz-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Printer size={48} color="#64748b" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>No Printers Detected</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px auto' }}>
            No printers were found in your Windows print spooler. Make sure the Windows Print Spooler service is running.
          </p>
          <button onClick={fetchPrinters} className="biz-btn-primary">
            Retry Scan
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {printers.map((p) => {
            const isSelected = selectedPrinter === p.name;
            const isVirtual = !!p.isVirtual;

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
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: isSelected
                        ? 'rgba(99, 102, 241, 0.2)'
                        : isVirtual
                        ? 'rgba(148, 163, 184, 0.1)'
                        : 'rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#818cf8' : isVirtual ? '#94a3b8' : '#10b981',
                    }}
                  >
                    {isVirtual ? <FileText size={22} /> : <Printer size={22} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {p.name}
                      </strong>

                      {/* Type Badge */}
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: isVirtual ? 'rgba(148, 163, 184, 0.15)' : 'rgba(16, 185, 129, 0.2)',
                          color: isVirtual ? '#94a3b8' : '#34d399',
                          fontWeight: 700,
                        }}
                      >
                        {isVirtual ? 'Virtual / Software' : 'Physical Hardware'}
                      </span>

                      {/* OS Default or Selected Target */}
                      {isSelected && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(99, 102, 241, 0.25)',
                            color: '#a5b4fc',
                            fontWeight: 700,
                          }}
                        >
                          Target Default
                        </span>
                      )}

                      {p.isDefault && !isSelected && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#cbd5e1',
                          }}
                        >
                          Windows Default
                        </span>
                      )}
                    </div>

                    {/* Capabilities badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
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
                        Sizes: {p.paperSizes?.join(', ') || 'A4'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {isSelected ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#10b981',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                      }}
                    >
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
      )}
    </div>
  );
}
