'use client';

import React, { useEffect, useState } from 'react';
import { useCustomerStore } from '../lib/store';
import { translations } from '../lib/i18n';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Portal } from '../ui/Portal';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingFooterProps {
  slug: string;
}

// Smooth counting animated number
function AnimatedPrice({ value, isQuoting }: { value: number; isQuoting: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = React.useRef(value);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = prevValueRef.current;
    const endVal = value;
    prevValueRef.current = value;
    const duration = 250;

    if (Math.abs(startVal - endVal) < 0.001) {
      setDisplayValue(endVal);
      return;
    }

    let frameId: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <span
      style={{
        fontSize: '1.45rem',
        fontWeight: 800,
        color: 'var(--accent-emerald)',
        letterSpacing: '-0.02em',
        opacity: isQuoting ? 0.7 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      ₹{displayValue.toFixed(2)}
    </span>
  );
}

export const PricingFooter: React.FC<PricingFooterProps> = ({ slug }) => {
  const { language, docs, totals, isQuoting } = useCustomerStore();
  const t = translations[language];

  const priceNum = totals ? totals.pricePaise / 100 : 0;

  return (
    <Portal>
      <AnimatePresence>
        {docs.length > 0 && (
          <motion.div
            className="bottom-floating-bar"
            role="region"
            aria-label="Pricing summary and checkout"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
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
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                  {t.totalEstimated}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.1, marginTop: '2px' }}>
                  <AnimatedPrice value={priceNum} isQuoting={isQuoting} />
                  {isQuoting && <Loader2 size={16} className="animate-spin" color="var(--accent-primary)" />}
                </div>
                {totals && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  borderRadius: 'var(--radius-md)',
                  gap: '6px',
                }}
              >
                <span>{t.continueToCheckout}</span>
                <ArrowRight size={17} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
