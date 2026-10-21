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
    <div className="animate-fade-in" style={{ width: '100%', paddingBottom: '32px' }}>
      <Header shopName={shop.shopName} isAvailable={shop.isAvailable} />

      {!shop.isAvailable && (
        <div
          className="glass-panel"
          style={{
            padding: '16px 18px',
            marginBottom: '18px',
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

      {/* Hero Welcome Card */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 20px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
          borderColor: 'rgba(99, 102, 241, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(79, 70, 229, 0.1)', marginBottom: '10px' }}>
          <Zap size={14} color="#4f46e5" />
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#4338ca',
            }}
          >
            Express Counter Print
          </span>
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '6px' }}>
          Upload &amp; Print in Seconds
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
          Skip the counter queue or WhatsApp file sharing. Choose your pages, verify live rates, and pick up your prints directly.
        </p>
      </div>

      {/* Pricing Catalog Section */}
      <div className="glass-panel" style={{ padding: '20px 18px', marginBottom: '22px' }}>
        <h3 style={{ fontSize: '1.02rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <FileText size={19} color="#4f46e5" />
          {t.priceList}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* A4 BW Single */}
          {pricing.A4_BW_SINGLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #f1f5f9', gap: '10px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>A4 Black &amp; White (Single)</strong>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Standard monochrome document</span>
              </div>
              <span style={{ fontSize: '1.18rem', fontWeight: 800, color: '#059669', flexShrink: 0 }}>
                ₹{(pricing.A4_BW_SINGLE.pricePaise / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* A4 BW Double */}
          {pricing.A4_BW_DOUBLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #f1f5f9', gap: '10px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>A4 B&amp;W (Back-to-Back)</strong>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Eco two sides on single sheet</span>
              </div>
              <span style={{ fontSize: '1.18rem', fontWeight: 800, color: '#059669', flexShrink: 0 }}>
                ₹{(pricing.A4_BW_DOUBLE.pricePaise / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* A4 Color Single */}
          {pricing.A4_COLOR_SINGLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #f1f5f9', gap: '10px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>A4 Full Colour</strong>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Certificates, photos, diagrams</span>
              </div>
              <span style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0284c7', flexShrink: 0 }}>
                ₹{(pricing.A4_COLOR_SINGLE.pricePaise / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link
          href={`/p/${slug}/cart`}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '16px 20px',
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 10px 28px rgba(79, 70, 229, 0.38)',
          }}
        >
          <span>{t.startPrinting}</span>
          <ArrowRight size={20} />
        </Link>

        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="btn-secondary"
          style={{ width: '100%', minHeight: '44px', fontSize: '0.86rem' }}
        >
          <Camera size={16} color="#6366f1" />
          <span>Scan Another Print Shop QR</span>
        </button>
      </div>

      <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </div>
  );
}
