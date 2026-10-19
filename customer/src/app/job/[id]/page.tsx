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
              particleCount: 80,
              spread: 60,
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
      <div style={{ textAlign: 'center', paddingTop: '80px', color: '#94a3b8' }}>
        <div className="pulse-online" style={{ margin: '0 auto 16px auto', width: '14px', height: '14px' }} />
        <p style={{ fontWeight: 600 }}>Tracking your print order...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="glass-panel" style={{ padding: '32px 20px', textAlign: 'center', marginTop: '40px' }}>
        <XCircle size={44} color="#f43f5e" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Order Not Found</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{error || 'Unable to locate order.'}</p>
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
    <div className="animate-fade-in">
      {/* Pickup Code Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          textAlign: 'center',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.1))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t.pickupCode}
        </span>
        <div
          onClick={handleCopyCode}
          style={{
            fontSize: '3rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            color: '#ffffff',
            margin: '8px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <span>{job.code}</span>
          {copiedCode ? <Check size={22} color="#10b981" /> : <Copy size={20} color="#94a3b8" />}
        </div>
        <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
          Show this code at the counter for pickup
        </p>
      </div>

      {/* Real-time Order Progress Stepper */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px' }}>{t.orderStatusTitle}</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Step 1: Submitted */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: isSubmitted ? 1 : 0.6 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isSubmitted ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSubmitted ? '#818cf8' : '#94a3b8',
              }}
            >
              <Clock size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '0.9rem', display: 'block' }}>{t.waitingShop}</strong>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Shopkeeper has received your request</span>
            </div>
          </div>

          {/* Step 2: Accepted */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: isAccepted ? 1 : isPrinted || isPrinting ? 0.6 : 0.3 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isAccepted ? 'rgba(6, 182, 212, 0.2)' : '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isAccepted ? '#06b6d4' : '#94a3b8',
              }}
            >
              <CheckCircle2 size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '0.9rem', display: 'block' }}>{t.accepted}</strong>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Accepted with one click</span>
            </div>
          </div>

          {/* Step 3: Printing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: isPrinting ? 1 : isPrinted ? 0.6 : 0.3 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isPrinting ? 'rgba(245, 158, 11, 0.2)' : '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isPrinting ? '#f59e0b' : '#94a3b8',
              }}
            >
              <Printer size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '0.9rem', display: 'block' }}>{t.printing}</strong>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Spooling sheets directly to printer</span>
            </div>
          </div>

          {/* Step 4: Ready for Pickup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: isPrinted ? 1 : 0.3 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isPrinted ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isPrinted ? '#10b981' : '#94a3b8',
              }}
            >
              <ShoppingBag size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', color: isPrinted ? '#10b981' : '#ffffff', display: 'block' }}>
                {t.readyForPickup}
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Collect your prints at the counter</span>
            </div>
          </div>

          {/* Special Terminal States */}
          {isRejected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f43f5e' }}>
              <XCircle size={24} />
              <div>
                <strong>{t.rejected}</strong>
                <span style={{ fontSize: '0.75rem', display: 'block', color: '#fca5a5' }}>
                  The shopkeeper was unable to accept this request.
                </span>
              </div>
            </div>
          )}

          {isFailed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f59e0b' }}>
              <AlertTriangle size={24} />
              <div>
                <strong>{t.printerIssue}</strong>
                <span style={{ fontSize: '0.75rem', display: 'block', color: '#fcd34d' }}>
                  The printer ran into a paper jam or error. Shop is resolving.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UPI Payment Section (if chosen) */}
      {job.paymentMode === 'UPI' && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>
            UPI Payment: ₹{(job.totals.pricePaise / 100).toFixed(2)}
          </h4>

          {qrDataUrl && (
            <div style={{ display: 'inline-block', padding: '12px', background: '#ffffff', borderRadius: '14px', margin: '12px 0' }}>
              <img src={qrDataUrl} alt="UPI QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
            </div>
          )}

          <div style={{ marginTop: '10px' }}>
            {job.paymentState === 'PAID_CONFIRMED' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} />
                <span>{t.paymentConfirmed}</span>
              </div>
            ) : job.paymentState === 'CUSTOMER_CLAIMED_PAID' ? (
              <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
                {t.paymentPending}
              </span>
            ) : (
              <button
                onClick={handleClaimPayment}
                disabled={claimingPayment}
                className="btn-secondary"
                style={{ width: '100%', padding: '12px' }}
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
            color: '#f43f5e',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '12px',
          }}
        >
          {t.cancelOrder}
        </button>
      )}

      {/* Privacy Guarantee Note */}
      <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
        <ShieldCheck size={14} color="#10b981" />
        <span>Your uploaded files are permanently deleted within 30s of print completion.</span>
      </div>
    </div>
  );
}
