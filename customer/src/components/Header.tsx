'use client';

import React from 'react';
import { useCustomerStore } from '../lib/store';
import { translations } from '../lib/i18n';
import { ShieldCheck, Globe } from 'lucide-react';

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
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            {shopName || 'PrintHub Express'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {isAvailable ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                <span className="pulse-online" /> {t.shopOnline}
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#f43f5e', fontWeight: 600 }}>
                ● {t.shopOffline}
              </span>
            )}
          </div>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '10px' }}
          title="Switch Language"
        >
          <Globe size={15} />
          {language === 'en' ? 'हिन्दी' : 'English'}
        </button>
      </div>

      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
        <ShieldCheck size={14} color="#10b981" />
        <span>{t.zeroTracePromise}</span>
      </div>
    </header>
  );
};
