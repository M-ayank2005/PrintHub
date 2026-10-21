'use client';

import React from 'react';
import { useCustomerStore } from '../lib/store';
import { translations } from '../lib/i18n';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface PricingFooterProps {
  slug: string;
}

export const PricingFooter: React.FC<PricingFooterProps> = ({ slug }) => {
  const { language, docs, totals, isQuoting } = useCustomerStore();
  const t = translations[language];

  if (docs.length === 0) return null;

  const priceRupees = totals ? (totals.pricePaise / 100).toFixed(2) : '--';

  return (
    <div className="bottom-floating-bar">
      <div
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
            {t.totalEstimated}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.1, marginTop: '2px' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              ₹{priceRupees}
            </span>
            {isQuoting && <Loader2 size={16} className="animate-spin" color="#4f46e5" />}
          </div>
          {totals && (
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {totals.sheets} {totals.sheets === 1 ? 'sheet' : 'sheets'} • {totals.bwSheets > 0 ? `${totals.bwSheets} B&W` : ''}{totals.colorSheets > 0 ? ` ${totals.colorSheets} Color` : ''}
            </span>
          )}
        </div>

        <Link
          href={`/p/${slug}/checkout`}
          className="btn-primary"
          style={{
            padding: '12px 18px',
            fontSize: '0.94rem',
            fontWeight: 800,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            borderRadius: '16px',
            gap: '6px',
          }}
        >
          <span>{t.continueToCheckout}</span>
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
};
