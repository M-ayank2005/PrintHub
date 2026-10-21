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
    <header className="glass-panel" style={{ padding: '14px 16px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(79, 70, 229, 0.28)',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Printer size={22} strokeWidth={2.2} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                fontSize: '1.12rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {shopName || 'PrintHub Express'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              {isAvailable ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    color: '#059669',
                    fontWeight: 700,
                    background: '#ecfdf5',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    lineHeight: '1.2',
                  }}
                >
                  <span className="pulse-online-wrapper">
                    <span className="pulse-online" />
                  </span>
                  <span>{t.shopOnline}</span>
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.74rem',
                    color: '#e11d48',
                    fontWeight: 700,
                    background: '#fff1f2',
                    padding: '2px 7px',
                    borderRadius: '8px',
                    lineHeight: '1.2',
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
          style={{
            padding: '7px 11px',
            fontSize: '0.8rem',
            borderRadius: '12px',
            fontWeight: 700,
            flexShrink: 0,
            minHeight: '36px',
          }}
          title="Switch Language"
        >
          <Globe size={14} color="#4f46e5" />
          <span>{language === 'en' ? 'हिन्दी' : 'EN'}</span>
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
