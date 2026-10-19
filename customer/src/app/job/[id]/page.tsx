'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getJobStatus, claimPayment, cancelJob } from '../../../lib/api';
import { useCustomerStore } from '../../../lib/store';
import { translations } from '../../../lib/i18n';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import {
  Clock,
  CheckCircle2,
  Printer,
  ShoppingBag,
  XCircle,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

export default function JobStatusPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const { language, sessionToken, shop } = useCustomerStore();
  const t = translations[language];

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [claimingPayment, setClaimingPayment] = useState(false);

  useEffect(() => {
    if (!jobId || !sessionToken) return;

    let isMounted = true;

    async function poll() {
      try {
        const data = await getJobStatus(sessionToken!, jobId);
        if (isMounted) {
          // If status transitioned to PRINTED, fire confetti!
          if (data.status === 'PRINTED' && job?.status !== 'PRINTED') {
            confetti({
              particleCount: 90,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
          setJob(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error fetching status');
          setLoading(false);
        }
      }
    }

    poll();
    const interval = setInterval(poll, 2500); // Poll every 2.5s for live updates

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId, sessionToken, job?.status]);

  // Generate UPI QR code if UPI payment is selected
  useEffect(() => {
    if (job && job.paymentMode === 'UPI' && shop?.upiId) {
      const amount = (job.totals.pricePaise / 100).toFixed(2);
      const payeeName = encodeURIComponent(shop.payeeName || shop.shopName || 'Print Cafe');
      const upiUri = `upi://pay?pa=${shop.upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${job.code}&tr=${job.id}`;

      QRCode.toDataURL(upiUri, { width: 220, margin: 1 }, (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      });
    }
  }, [job, shop]);

  const handleCopyCode = () => {
    if (!job?.code) return;
    navigator.clipboard.writeText(job.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClaimPayment = async () => {
    if (!sessionToken || !jobId) return;
    setClaimingPayment(true);
    try {
      await claimPayment(sessionToken, jobId);
      setJob((prev: any) => ({ ...prev, paymentState: 'CUSTOMER_CLAIMED_PAID' }));
    } catch (err) {
      console.error(err);
    } finally {
      setClaimingPayment(false);
    }
  };

  const handleCancel = async () => {
    if (!sessionToken || !jobId) return;
    if (!confirm('Are you sure you want to cancel this print order?')) return;
    try {
      await cancelJob(sessionToken, jobId);
      setJob((prev: any) => ({ ...prev, status: 'CANCELLED' }));
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '100px', color: '#64748b' }}>
        <div className="pulse-online" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }} />
        <p style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Tracking your print order...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center', marginTop: '40px', maxWidth: '480px', margin: '40px auto 0 auto' }}>
        <XCircle size={44} color="#e11d48" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>Order Not Found</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{error || 'Unable to locate order.'}</p>
      </div>
    );
  }

  const isPrinted = job.status === 'PRINTED';
  const isPrinting = job.status === 'PRINTING';
  const isAccepted = job.status === 'ACCEPTED' || job.status === 'QUEUED';
  const isSubmitted = job.status === 'SUBMITTED';
  const isRejected = job.status === 'REJECTED';
  const isExpired = job.status === 'EXPIRED';
  const isFailed = job.status === 'FAILED_PRINT';
  const isCancelled = job.status === 'CANCELLED';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '0 auto', paddingBottom: '32px' }}>
      {/* Pickup Code Hero Card */}
      <div
        className="glass-panel"
        style={{
          padding: '28px 24px',
          textAlign: 'center',
          marginBottom: '20px',
          background: '#4f46e5',
          color: '#ffffff',
          boxShadow: '0 16px 36px rgba(79, 70, 229, 0.35)',
          border: 'none',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
          {t.pickupCode}
        </span>
        <div
          onClick={handleCopyCode}
          style={{
            fontSize: '3.6rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            margin: '8px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <span>{job.code}</span>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {copiedCode ? <Check size={20} color="#ffffff" /> : <Copy size={18} color="#ffffff" />}
          </div>
        </div>
        <p style={{ fontSize: '0.88rem', opacity: 0.95, fontWeight: 500 }}>
          Show this code at the counter to collect your prints
        </p>
      </div>

      {/* Real-time Order Progress Stepper */}
      <div className="glass-panel" style={{ padding: '22px 20px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '18px', color: '#0f172a' }}>
          {t.orderStatusTitle}
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1: Submitted */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: isSubmitted ? 1 : 0.65 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isSubmitted ? 'rgba(79, 70, 229, 0.15)' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSubmitted ? '#4f46e5' : '#94a3b8',
                boxShadow: isSubmitted ? '0 0 0 4px rgba(79, 70, 229, 0.1)' : 'none',
              }}
            >
              <Clock size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>{t.waitingShop}</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Shopkeeper has received your request</span>
            </div>
          </div>

          {/* Step 2: Accepted */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: isAccepted ? 1 : isPrinted || isPrinting ? 0.65 : 0.4 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isAccepted ? 'rgba(2, 132, 199, 0.15)' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isAccepted ? '#0284c7' : '#94a3b8',
                boxShadow: isAccepted ? '0 0 0 4px rgba(2, 132, 199, 0.1)' : 'none',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>{t.accepted}</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Accepted with one click</span>
            </div>
          </div>

          {/* Step 3: Printing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: isPrinting ? 1 : isPrinted ? 0.65 : 0.4 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isPrinting ? 'rgba(217, 119, 6, 0.15)' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isPrinting ? '#d97706' : '#94a3b8',
                boxShadow: isPrinting ? '0 0 0 4px rgba(217, 119, 6, 0.1)' : 'none',
              }}
            >
              <Printer size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>{t.printing}</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Spooling sheets directly to printer</span>
            </div>
          </div>

          {/* Step 4: Ready for Pickup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: isPrinted ? 1 : 0.4 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isPrinted ? 'rgba(5, 150, 105, 0.18)' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isPrinted ? '#059669' : '#94a3b8',
                boxShadow: isPrinted ? '0 0 0 6px rgba(5, 150, 105, 0.15)' : 'none',
              }}
            >
              <ShoppingBag size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '0.98rem', color: isPrinted ? '#059669' : '#0f172a', fontWeight: 800, display: 'block' }}>
                {t.readyForPickup}
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Collect your printed sheets at the counter</span>
            </div>
          </div>

          {/* Terminal error states */}
          {isRejected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#e11d48', background: '#fff1f2', padding: '12px 16px', borderRadius: '12px' }}>
              <XCircle size={24} />
              <div>
                <strong style={{ fontSize: '0.92rem' }}>{t.rejected}</strong>
                <span style={{ fontSize: '0.78rem', display: 'block', color: '#9f1239' }}>
                  The shopkeeper was unable to accept this request.
                </span>
              </div>
            </div>
          )}

          {isFailed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#d97706', background: '#fffbeb', padding: '12px 16px', borderRadius: '12px' }}>
              <AlertTriangle size={24} />
              <div>
                <strong style={{ fontSize: '0.92rem' }}>{t.printerIssue}</strong>
                <span style={{ fontSize: '0.78rem', display: 'block', color: '#92400e' }}>
                  The printer ran into a paper jam or error. Shop is resolving.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UPI Payment Section (if chosen) */}
      {job.paymentMode === 'UPI' && (
        <div className="glass-panel" style={{ padding: '24px 20px', marginBottom: '20px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>
            UPI Payment: ₹{(job.totals.pricePaise / 100).toFixed(2)}
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px' }}>
            Scan with Google Pay, PhonePe, Paytm, or BHIM
          </p>

          {qrDataUrl && (
            <div
              style={{
                display: 'inline-block',
                padding: '16px',
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                margin: '8px 0 16px 0',
              }}
            >
              <img src={qrDataUrl} alt="UPI QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
            </div>
          )}

          <div style={{ marginTop: '10px' }}>
            {job.paymentState === 'PAID_CONFIRMED' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#059669',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  background: '#ecfdf5',
                  padding: '12px',
                  borderRadius: '12px',
                }}
              >
                <CheckCircle2 size={20} />
                <span>{t.paymentConfirmed}</span>
              </div>
            ) : job.paymentState === 'CUSTOMER_CLAIMED_PAID' ? (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  color: '#b45309',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                }}
              >
                ⏳ {t.paymentPending}
              </div>
            ) : (
              <button
                onClick={handleClaimPayment}
                disabled={claimingPayment}
                className="btn-primary"
                style={{ width: '100%', padding: '14px' }}
              >
                {claimingPayment ? 'Updating...' : t.iHavePaidUpi}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cancel Action if still waiting */}
      {isSubmitted && (
        <button
          onClick={handleCancel}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#e11d48',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '12px',
          }}
        >
          {t.cancelOrder}
        </button>
      )}

      {/* Privacy Guarantee Note */}
      <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
        <ShieldCheck size={16} color="#059669" />
        <span>Your uploaded files are permanently deleted within 30s of print completion.</span>
      </div>
    </div>
  );
}
