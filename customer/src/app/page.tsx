'use client';

import React from 'react';
import { QrCode, Printer, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div style={{ textAlign: 'center', paddingTop: '32px' }} className="animate-fade-in">
      <div
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '24px',
          background: '#4f46e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 12px 30px rgba(79, 70, 229, 0.35)',
        }}
      >
        <Printer size={38} color="#ffffff" />
      </div>

      <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: '#0f172a' }}>
        PrintHub Express
      </h1>
      <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '28px' }}>
        Instant, silent document printing for print cafes. Scan the counter QR standee to get started in seconds.
      </p>

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

      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
        <ShieldCheck size={26} color="#059669" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.82rem', color: '#065f46', lineHeight: 1.45 }}>
          <strong>Zero-Trace Guarantee:</strong> Files are encrypted in transit and automatically destroyed within 30 seconds of print completion.
        </span>
      </div>
    </div>
  );
}
