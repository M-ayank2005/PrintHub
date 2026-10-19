'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../../../../components/Header';
import { useCustomerStore } from '../../../../lib/store';
import { translations } from '../../../../lib/i18n';
import { submitJob } from '../../../../lib/api';
import { CheckCircle2, User, Phone, QrCode, Store, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
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
      <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center', marginTop: '40px', maxWidth: '480px', margin: '40px auto 0 auto' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>Your cart is empty</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
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
    <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '0 auto', paddingBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link href={`/p/${slug}/cart`} className="btn-secondary" style={{ padding: '10px 14px', borderRadius: '12px' }}>
          <ArrowLeft size={18} color="#0f172a" />
        </Link>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {t.checkoutTitle}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Confirm details for instant print release</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer Details Form */}
        <div className="glass-panel" style={{ padding: '22px 20px', marginBottom: '18px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              <User size={15} color="#4f46e5" style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
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
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.95rem',
                fontWeight: 600,
                boxShadow: 'var(--shadow-sm)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              <Phone size={15} color="#4f46e5" style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
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
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.95rem',
                fontWeight: 500,
                boxShadow: 'var(--shadow-sm)',
              }}
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="glass-panel" style={{ padding: '22px 20px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', color: '#0f172a' }}>
            {t.paymentMethod}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Pay at Counter */}
            <div
              onClick={() => setPaymentMode('COUNTER')}
              style={{
                padding: '16px 18px',
                borderRadius: '16px',
                background: paymentMode === 'COUNTER' ? '#eef2ff' : '#ffffff',
                border: `2px solid ${paymentMode === 'COUNTER' ? '#4f46e5' : '#e2e8f0'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: paymentMode === 'COUNTER' ? '0 4px 14px rgba(79, 70, 229, 0.15)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: paymentMode === 'COUNTER' ? 'rgba(79, 70, 229, 0.15)' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: paymentMode === 'COUNTER' ? '#4f46e5' : '#64748b',
                  }}
                >
                  <Store size={22} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{t.payCounter}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{t.payCounterDesc}</span>
                </div>
              </div>
              <input
                type="radio"
                name="payment"
                checked={paymentMode === 'COUNTER'}
                onChange={() => setPaymentMode('COUNTER')}
                style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
              />
            </div>

            {/* Pay via UPI */}
            <div
              onClick={() => setPaymentMode('UPI')}
              style={{
                padding: '16px 18px',
                borderRadius: '16px',
                background: paymentMode === 'UPI' ? '#eef2ff' : '#ffffff',
                border: `2px solid ${paymentMode === 'UPI' ? '#4f46e5' : '#e2e8f0'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: paymentMode === 'UPI' ? '0 4px 14px rgba(79, 70, 229, 0.15)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: paymentMode === 'UPI' ? 'rgba(79, 70, 229, 0.15)' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: paymentMode === 'UPI' ? '#4f46e5' : '#64748b',
                  }}
                >
                  <QrCode size={22} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{t.payUpi}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{t.payUpiDesc}</span>
                </div>
              </div>
              <input
                type="radio"
                name="payment"
                checked={paymentMode === 'UPI'}
                onChange={() => setPaymentMode('UPI')}
                style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
              />
            </div>
          </div>
        </div>

        {/* Order Summary & Breakdown */}
        <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', color: '#64748b' }}>
            <span>Total Documents:</span>
            <strong style={{ color: '#0f172a' }}>{totals.documents}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', color: '#64748b' }}>
            <span>Total Pages / Sheets:</span>
            <strong style={{ color: '#0f172a' }}>{totals.pages} pages ({totals.sheets} sheets)</strong>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Total Amount:</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              ₹{priceRupees}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '14px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', fontSize: '0.88rem', marginBottom: '18px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
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

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
          <ShieldCheck size={14} color="#059669" />
          <span>Automatic 30-second post-print purge active</span>
        </div>
      </form>
    </div>
  );
}
