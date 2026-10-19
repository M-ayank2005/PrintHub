'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../../../components/Header';
import { useCustomerStore } from '../../../lib/store';
import { translations } from '../../../lib/i18n';
import { fetchShop, createSession } from '../../../lib/api';
import { ArrowRight, FileText, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function ShopLandingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { language, shop, setShop, setSession } = useCustomerStore();
  const t = translations[language];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div style={{ textAlign: 'center', paddingTop: '80px', color: '#94a3b8' }}>
        <div className="pulse-online" style={{ margin: '0 auto 16px auto', width: '14px', height: '14px' }} />
        <p style={{ fontWeight: 600 }}>Connecting to print cafe...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center', marginTop: '40px' }}>
        <AlertCircle size={44} color="#f43f5e" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Shop Not Found</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
          {error || 'This QR code is either invalid or expired.'}
        </p>
      </div>
    );
  }

  const pricing = shop.pricing || {};

  return (
    <div className="animate-fade-in">
      <Header shopName={shop.shopName} isAvailable={shop.isAvailable} />

      {!shop.isAvailable && (
        <div
          className="glass-panel"
          style={{
            padding: '16px',
            marginBottom: '20px',
            borderColor: 'rgba(244, 63, 94, 0.4)',
            backgroundColor: 'rgba(244, 63, 94, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <ShieldAlert size={24} color="#f43f5e" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
            {t.shopOffline}. New print submissions are temporarily paused.
          </span>
        </div>
      )}

      {/* Pricing Catalog Section */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#818cf8" />
          {t.priceList}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* A4 BW Single */}
          {pricing.A4_BW_SINGLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>A4 Black & White (Single-sided)</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8' }}>Standard monochrome document</span>
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981' }}>
                ₹{(pricing.A4_BW_SINGLE.pricePaise / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* A4 BW Double */}
          {pricing.A4_BW_DOUBLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>A4 Black & White (Duplex / Back-to-Back)</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8' }}>Two sides on one sheet</span>
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981' }}>
                ₹{(pricing.A4_BW_DOUBLE.pricePaise / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* A4 Color Single */}
          {pricing.A4_COLOR_SINGLE?.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>A4 Full Colour</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8' }}>Certificates, photos, posters</span>
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#06b6d4' }}>
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
