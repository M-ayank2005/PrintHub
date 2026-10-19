'use client';

import React from 'react';
import { QrCode, Printer, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div style={{ textAlign: 'center', paddingTop: '40px' }}>
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)',
        }}
      >
        <Printer size={36} color="#ffffff" />
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '10px' }}>
        PrintHub Express
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '32px' }}>
        Instant, silent document printing for print cafes. Scan the QR code at your local cafe counter to get started.
      </p>

      <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="#06b6d4" />
          How it works
        </h3>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', color: '#cbd5e1', fontSize: '0.9rem' }}>
          <li>Scan the QR poster on the shop counter</li>
          <li>Upload your PDFs, photos, or scan documents</li>
          <li>Choose B&W or colour, copies, and review your price</li>
          <li>Submit and collect your prints in seconds</li>
        </ol>
      </div>

      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
        <Shield size={24} color="#10b981" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          <strong>Zero-Trace Guarantee:</strong> Your documents are never viewable by the shopkeeper and are permanently deleted right after printing.
        </span>
      </div>
    </div>
  );
}
