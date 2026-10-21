'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useBusinessStore } from '../../lib/store';
import { api } from '../../lib/api';
import QRCode from 'qrcode';
import { Printer, RefreshCw, QrCode as QrIcon, ShieldCheck } from 'lucide-react';

export default function PosterPage() {
  const { business, setBusiness } = useBusinessStore();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  const shopSlug = business?.slug || 'sample-slug';
  const customerBase = (process.env.NEXT_PUBLIC_CUSTOMER_URL || '').replace(/\/+$/, '');
  const customerUrl = `${customerBase}/p/${shopSlug}`;

  useEffect(() => {
    if (shopSlug) {
      QRCode.toDataURL(customerUrl, { width: 320, margin: 1 }, (err, url) => {
        if (!err && url) {
          setQrUrl(url);
        }
      });
    }
  }, [shopSlug, customerUrl]);

  const handlePrintPoster = () => {
    window.print();
  };

  const handleRotateSlug = async () => {
    if (!confirm('Regenerating your shop QR code will immediately invalidate all previously printed posters. Continue?')) {
      return;
    }
    setIsRotating(true);
    try {
      const res = await api.rotateSlug();
      setBusiness({ ...business, slug: res.slug });
    } catch (err: any) {
      alert(err.message || 'Failed to rotate QR slug');
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Shop QR Counter Poster
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Print this poster and place it on your cafe billing counter. Customers scan it with their camera to print directly.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleRotateSlug} disabled={isRotating} className="biz-btn-secondary">
            <RefreshCw size={16} />
            {isRotating ? 'Regenerating...' : 'Regenerate QR Slug'}
          </button>

          <button onClick={handlePrintPoster} className="biz-btn-primary">
            <Printer size={18} />
            Print Counter Poster (A4 / A5)
          </button>
        </div>
      </div>

      {/* Printable Poster Container */}
      <div
        id="printable-poster"
        className="biz-card"
        style={{
          maxWidth: '520px',
          margin: '0 auto',
          padding: '48px 36px',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          color: '#000000',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>🖨️</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em', color: '#4f46e5', textTransform: 'uppercase' }}>
            PrintHub
          </span>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
          {business?.shopName || 'Cyber Print Cafe'}
        </h2>
        <p style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600, marginBottom: '28px' }}>
          Self-Service Fast Printing
        </p>

        {/* QR Code Container */}
        {qrUrl ? (
          <div
            style={{
              display: 'inline-block',
              padding: '16px',
              border: '3px solid #0f172a',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              marginBottom: '28px',
            }}
          >
            <img src={qrUrl} alt="Shop QR Code" style={{ width: '260px', height: '260px', display: 'block' }} />
          </div>
        ) : (
          <div style={{ width: '260px', height: '260px', margin: '0 auto 28px auto', background: '#f1f5f9' }} />
        )}

        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
          Scan with your Phone Camera
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
            <span style={{ display: 'block', fontSize: '1.2rem', marginBottom: '4px' }}>📱</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>1. Scan QR</strong>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>No app needed</span>
          </div>
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
            <span style={{ display: 'block', fontSize: '1.2rem', marginBottom: '4px' }}>📄</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>2. Upload</strong>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>PDF, photos, scans</span>
          </div>
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
            <span style={{ display: 'block', fontSize: '1.2rem', marginBottom: '4px' }}>⚡</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>3. Collect</strong>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Instant silent print</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
          <ShieldCheck size={16} />
          <span>Guaranteed Privacy: Files are permanently deleted right after printing</span>
        </div>
      </div>
    </div>
  );
}
