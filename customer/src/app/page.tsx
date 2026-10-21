'use client';

import React, { useState } from 'react';
import { QrCode, Printer, ShieldCheck, Zap, Camera, Smartphone, ArrowRight, Sparkles } from 'lucide-react';
import { QrScannerModal } from '../components/QrScannerModal';

export default function HomePage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <div style={{ textAlign: 'center', paddingTop: '24px', maxWidth: '480px', margin: '0 auto' }} className="animate-fade-in">
      {/* Top Brand Icon */}
      <div
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '24px',
          background: '#4f46e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px auto',
          boxShadow: '0 12px 30px rgba(79, 70, 229, 0.35)',
        }}
      >
        <Printer size={38} color="#ffffff" />
      </div>

      {/* Main Title & Subtitle */}
      <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: '#0f172a' }}>
        PrintHub Express
      </h1>
      <p style={{ color: '#475569', fontSize: '0.94rem', lineHeight: '1.5', marginBottom: '24px' }}>
        Instant, silent document printing for print cafes. Connect to your local print shop in seconds.
      </p>

      {/* Primary Interactive Scanner Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 20px',
          textAlign: 'center',
          marginBottom: '22px',
          border: '2px solid #818cf8',
          background: '#ffffff',
          boxShadow: '0 12px 35px -8px rgba(99, 102, 241, 0.22)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '20px',
              background: '#e0e7ff',
              color: '#4338ca',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Ready at the shop counter?
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '16px 20px',
            fontSize: '1.05rem',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
            cursor: 'pointer',
          }}
        >
          <Camera size={22} />
          <span>Scan Counter QR Code</span>
        </button>

        <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '12px', lineHeight: 1.45 }}>
          Point your camera at the shop standee to start uploading your documents immediately.
        </p>

        {/* Dual Method Clarification */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px dashed #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: '#475569',
          }}
        >
          <Smartphone size={16} color="#4f46e5" />
          <span>
            Works with <strong>Google Lens</strong>, your phone&apos;s camera app, or this web scanner.
          </span>
        </div>
      </div>

      {/* How it works Card */}
      <div className="glass-panel" style={{ padding: '24px 22px', textAlign: 'left', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <Zap size={20} color="#4f46e5" />
          How it works
        </h3>
        <ol style={{ paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '12px', color: '#334155', fontSize: '0.92rem', fontWeight: 500 }}>
          <li>Scan the QR standee at the print shop counter</li>
          <li>Upload your PDFs, photos, or scan with phone camera</li>
          <li>Select B&W or colour, copies, and review your live quote</li>
          <li>Submit order and collect prints with your 3-digit pickup PIN</li>
        </ol>
      </div>

      {/* Zero-Trace Security Guarantee Card */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
        <ShieldCheck size={26} color="#059669" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.82rem', color: '#065f46', lineHeight: 1.45 }}>
          <strong>Zero-Trace Guarantee:</strong> Files are encrypted in transit and automatically destroyed from storage within 30 seconds of print completion.
        </span>
      </div>

      {/* Fullscreen Interactive QR Scanner Modal */}
      <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </div>
  );
}
