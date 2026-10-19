'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../../../../components/Header';
import { useCustomerStore } from '../../../../lib/store';
import { translations } from '../../../../lib/i18n';
import { submitJob } from '../../../../lib/api';
import { CheckCircle2, User, Phone, QrCode, Store, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { language, shop, sessionToken, docs, totals, clearCart } = useCustomerStore();
  const t = translations[language];

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'COUNTER' | 'UPI'>('COUNTER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (docs.length === 0 || !totals) {
    return (
      <div className="glass-panel" style={{ padding: '32px 20px', textAlign: 'center', marginTop: '40px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Your cart is empty</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
          Please add at least one document to proceed to checkout.
        </p>
        <Link href={`/p/${slug}/cart`} className="btn-primary">
          Back to Cart
        </Link>
      </div>
    );
  }

  const priceRupees = (totals.pricePaise / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !sessionToken) {
      setError('Please enter your name for order pickup.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const submitDocs = docs.map((doc) => ({
        docId: doc.docId,
        kind: doc.kind,
        storageKey: doc.storageKey,
        sizeBytes: doc.sizeBytes,
        pages: doc.pages,
        options: doc.options,
      }));

      const res = await submitJob(sessionToken, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        paymentMode,
        expectedTotalPaise: totals.pricePaise,
        docs: submitDocs,
      });

      // Clear local cart and navigate to live tracking page
      clearCart();
      router.push(`/job/${res.job.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit order');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Link href={`/p/${slug}/cart`} className="btn-secondary" style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} />
        </Link>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
          {t.checkoutTitle}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer Details Form */}
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              <User size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
              {t.yourName} *
            </label>
            <input
              type="text"
              required
              placeholder={t.namePlaceholder}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              <Phone size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
              {t.phoneNumber}
            </label>
            <input
              type="tel"
              placeholder={t.phonePlaceholder}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '0.95rem',
              }}
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', color: '#ffffff' }}>
            {t.paymentMethod}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Pay at Counter */}
            <div
              onClick={() => setPaymentMode('COUNTER')}
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: paymentMode === 'COUNTER' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${paymentMode === 'COUNTER' ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Store size={22} color={paymentMode === 'COUNTER' ? '#818cf8' : '#94a3b8'} />
                <div>
                  <strong style={{ fontSize: '0.9rem', display: 'block' }}>{t.payCounter}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.payCounterDesc}</span>
                </div>
              </div>
              <input type="radio" checked={paymentMode === 'COUNTER'} onChange={() => setPaymentMode('COUNTER')} />
            </div>

            {/* Pay via UPI */}
            <div
              onClick={() => setPaymentMode('UPI')}
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: paymentMode === 'UPI' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${paymentMode === 'UPI' ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <QrCode size={22} color={paymentMode === 'UPI' ? '#818cf8' : '#94a3b8'} />
                <div>
                  <strong style={{ fontSize: '0.9rem', display: 'block' }}>{t.payUpi}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.payUpiDesc}</span>
                </div>
              </div>
              <input type="radio" checked={paymentMode === 'UPI'} onChange={() => setPaymentMode('UPI')} />
            </div>
          </div>
        </div>

        {/* Order Summary & Breakdown */}
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>Total Documents:</span>
            <strong style={{ color: '#fff' }}>{totals.documents}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>Total Pages / Sheets:</span>
            <strong style={{ color: '#fff' }}>{totals.pages} pages ({totals.sheets} sheets)</strong>
          </div>
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>Total Amount:</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
              ₹{priceRupees}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '1.05rem' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>{t.submitting}</span>
            </>
          ) : (
            <span>{t.sendToShop} (₹{priceRupees})</span>
          )}
        </button>
      </form>
    </div>
  );
}
