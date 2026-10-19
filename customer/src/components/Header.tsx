'use client';

import React from 'react';
import { useCustomerStore } from '../lib/store';
import { translations } from '../lib/i18n';
import { ShieldCheck, Globe, Printer } from 'lucide-react';

interface HeaderProps {
  shopName?: string;
  isAvailable?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ shopName, isAvailable = true }) => {
  const { language, setLanguage } = useCustomerStore();
  const t = translations[language];

  return (
    <header className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(79, 70, 229, 0.3)',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Printer size={22} />
          </div>

          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
              {shopName || 'PrintHub Express'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              {isAvailable ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: '#059669',
                    fontWeight: 700,
                    background: '#ecfdf5',
                    padding: '2px 8px',
                    borderRadius: '8px',
                  }}
                >
                  <span className="pulse-online" /> {t.shopOnline}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#e11d48',
                    fontWeight: 700,
                    background: '#fff1f2',
                    padding: '2px 8px',
                    borderRadius: '8px',
                  }}
                >
                  ● {t.shopOffline}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.82rem', borderRadius: '12px', fontWeight: 700 }}
          title="Switch Language"
        >
          <Globe size={15} color="#4f46e5" />
          <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>
      </div>

      <div
        style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          color: '#64748b',
          fontWeight: 500,
        }}
      >
        <ShieldCheck size={14} color="#059669" />
        <span>{t.zeroTracePromise}</span>
      </div>
    </header>
  );
};
