'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Printer,
  Camera,
  ShieldCheck,
  Zap,
  Smartphone,
  ArrowRight,
  Sparkles,
  QrCode,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { QrScannerModal } from '../components/QrScannerModal';

export default function HomePage() {
  const router = useRouter();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleManualGo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim().toLowerCase().replace(/^\/p\//, '');
    if (!clean) return;
    router.push(`/p/${clean}`);
  };

  return (
    <div
      style={{
        textAlign: 'center',
        paddingTop: '20px',
        maxWidth: '480px',
        margin: '0 auto',
      }}
      className="animate-fade-in"
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '30px', background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.15)', marginBottom: '18px' }}>
        <span className="pulse-online-wrapper">
          <span className="pulse-online" />
        </span>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca', letterSpacing: '0.02em' }}>
          Self-Service Print Station
        </span>
      </div>

      {/* Brand Icon & Heading */}
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 14px 28px -6px rgba(79, 70, 229, 0.38)',
        }}
      >
        <Printer size={36} color="#ffffff" strokeWidth={2.2} />
      </div>

      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.035em',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        PrintHub Express
      </h1>
      <p
        style={{
          color: '#64748b',
          fontSize: '0.94rem',
          lineHeight: '1.55',
          marginBottom: '26px',
          padding: '0 8px',
        }}
      >
        Instant, zero-trace document printing at your local print cafe. Scan the counter QR code to upload and print in seconds.
      </p>

      {/* Primary Scanner Action Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 20px',
          borderRadius: '24px',
          textAlign: 'center',
          marginBottom: '24px',
          border: '1px solid rgba(99, 102, 241, 0.22)',
          background: '#ffffff',
          boxShadow: '0 20px 45px -12px rgba(79, 70, 229, 0.14)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative background light */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Big Interactive Scanner CTA Button */}
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          style={{
            width: '100%',
            padding: '18px 22px',
            fontSize: '1.05rem',
            fontWeight: 800,
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 10px 28px rgba(79, 70, 229, 0.38)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Camera size={24} strokeWidth={2.3} />
          <span>Scan Counter QR Code</span>
        </button>

        <p style={{ color: '#64748b', fontSize: '0.84rem', marginTop: '12px', lineHeight: 1.45 }}>
          Point your camera at the print shop standee to connect instantly.
        </p>

        {/* Inline Quick Code / Slug Input */}
        <div
          style={{
            marginTop: '18px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Or enter print cafe slug directly
          </div>
          <form onSubmit={handleManualGo} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. cyber-corner"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{
                flex: 1,
                padding: '11px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.88rem',
                color: '#0f172a',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              style={{
                padding: '11px 18px',
                borderRadius: '12px',
                background: manualCode.trim() ? '#4f46e5' : '#e2e8f0',
                color: manualCode.trim() ? '#ffffff' : '#94a3b8',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: manualCode.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Go</span>
              <ArrowRight size={15} />
            </button>
          </form>
        </div>

        {/* Dual Support Banner */}
        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: '#475569',
          }}
        >
          <Smartphone size={16} color="#4f46e5" style={{ flexShrink: 0 }} />
          <span>
            Works with <strong>Google Lens</strong>, native camera, or web scanner.
          </span>
        </div>
      </div>

      {/* How It Works - 3 Crisp Steps */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 20px',
          borderRadius: '22px',
          textAlign: 'left',
          marginBottom: '20px',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <Zap size={18} color="#4f46e5" strokeWidth={2.4} />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            How PrintHub Works
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: '#e0e7ff',
                color: '#4338ca',
                fontWeight: 800,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              1
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Scan Counter Standee
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                Point your phone at the print cafe&apos;s desk QR code to open their instant upload terminal.
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: '#e0e7ff',
                color: '#4338ca',
                fontWeight: 800,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              2
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Upload & Select Settings
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                Choose PDFs, images, or snap paper docs. Select B&amp;W or Colour, page range, and copies.
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: '#e0e7ff',
                color: '#4338ca',
                fontWeight: 800,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              3
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Instant Silent Printing &amp; Pickup
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                The shop printer produces your pages automatically. Claim your order using your 3-digit PIN.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Zero-Trace Guarantee */}
      <div
        style={{
          padding: '16px 18px',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
        }}
      >
        <ShieldCheck size={26} color="#16a34a" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.45 }}>
          <strong>Zero-Trace Guarantee:</strong> All files are encrypted in transit and permanently deleted within 30 seconds after printing.
        </span>
      </div>

      {/* Scanner Modal */}
      <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </div>
  );
}

