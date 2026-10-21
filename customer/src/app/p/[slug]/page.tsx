'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '../../../components/Header';
import { useCustomerStore } from '../../../lib/store';
import { translations } from '../../../lib/i18n';
import { fetchShop, createSession } from '../../../lib/api';
import { ArrowRight, FileText, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Zap, ShieldCheck, Camera } from 'lucide-react';
import Link from 'next/link';
import { QrScannerModal } from '../../../components/QrScannerModal';

export default function ShopLandingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { language, shop, setShop, setSession } = useCustomerStore();
  const t = translations[language];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;

    async function init() {
      try {
        setLoading(true);
        const shopData = await fetchShop(slug);
        setShop(shopData);

        const session = await createSession(slug);
        setSession(session.token, session.sessionId);
      } catch (err: any) {
        setError(err.message || 'Unable to load shop details');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '100px', color: '#64748b' }}>
        <div className="pulse-online" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }} />
        <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Connecting to print cafe...</p>
        <span style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', display: 'block' }}>Establishing secure zero-trace session</span>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="glass-panel" style={{ padding: '36px 24px', textAlign: 'center', marginTop: '40px' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#fff1f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <AlertCircle size={32} color="#e11d48" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>Shop Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
          {error || 'This QR code is either invalid or expired.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="btn-primary"
            style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', fontSize: '0.92rem' }}
          >
            <Camera size={18} />
            <span>Scan Another QR Code</span>
          </button>

          <Link
            href="/"
            style={{
              display: 'inline-block',
              fontSize: '0.85rem',
              color: '#4f46e5',
              fontWeight: 700,
              textDecoration: 'none',
              marginTop: '6px',
            }}
          >
            ← Back to Homepage
          </Link>
        </div>

        <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      </div>
    );
  }

  const pricing = shop.pricing || {};

  return (
    <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '0 auto', paddingBottom: '32px' }}>
      <Header shopName={shop.shopName} isAvailable={shop.isAvailable} />

      {!shop.isAvailable && (
        <div
          className="glass-panel"
          style={{
            padding: '16px 18px',
            marginBottom: '20px',
            borderColor: '#fecdd3',
            backgroundColor: '#fff1f2',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <ShieldAlert size={24} color="#e11d48" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.88rem', color: '#9f1239', fontWeight: 600 }}>
            {t.shopOffline}. New print submissions are temporarily paused.
          </span>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 20px',
          marginBottom: '20px',
          background: '#eef2ff',
          borderColor: '#c7d2fe',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#4f46e5',
            }}
          >
            ⚡ Express Counter Print
          </span>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '6px' }}>
          Upload & Print in Seconds
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
          Skip the counter queue or WhatsApp forwards. Choose your pages, check live rates, and pick up your prints directly.
        </p>
      </div>

      {/* Pricing Catalog Section */}
      <div className="glass-panel" style={{ padding: '22px 20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <FileText size={20} color="#4f46e5" />
          {t.priceList}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* A4 BW Single */}
          {pricing.A4_BW_SINGLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>A4 Black & White (Single)</strong>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Standard monochrome document</span>
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>
                ₹{(pricing.A4_BW_SINGLE.pricePaise / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* A4 BW Double */}
          {pricing.A4_BW_DOUBLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>A4 B&W (Back-to-Back)</strong>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Two sides on single sheet</span>
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>
                ₹{(pricing.A4_BW_DOUBLE.pricePaise / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* A4 Color Single */}
          {pricing.A4_COLOR_SINGLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>A4 Full Colour</strong>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Certificates, photos, artwork</span>
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0284c7' }}>
                ₹{(pricing.A4_COLOR_SINGLE.pricePaise / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Start Printing CTA Button */}
      <Link
        href={`/p/${slug}/cart`}
        className="btn-primary"
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}
      >
        <span>{t.startPrinting}</span>
        <ArrowRight size={20} />
      </Link>
    </div>
  );
}
