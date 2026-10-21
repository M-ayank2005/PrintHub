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
  Check,
  Printer,
  ShoppingBag,
  XCircle,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Copy,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { StepIndicator, Card, Button, Sheet, useToast } from '../../../ui';

const STATUS_ORDER: Record<string, number> = {
  SUBMITTED: 0,
  ACCEPTED: 1,
  QUEUED: 1,
  PRINTING: 2,
  PRINTED: 3,
};

export default function JobStatusPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const { language, sessionToken, shop } = useCustomerStore();
  const t = translations[language];
  const { showToast } = useToast();

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [claimingPayment, setClaimingPayment] = useState(false);
  const [isCancelSheetOpen, setIsCancelSheetOpen] = useState(false);

  useEffect(() => {
    if (!jobId || !sessionToken) return;

    let isMounted = true;

    async function poll() {
      try {
        const data = await getJobStatus(sessionToken!, jobId);
        if (isMounted) {
          // If status transitioned to PRINTED, fire celebratory confetti
          if (data.status === 'PRINTED' && job?.status !== 'PRINTED') {
            confetti({
              particleCount: 100,
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
    const interval = setInterval(poll, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId, sessionToken, job?.status]);

  // Generate UPI QR code if UPI payment is chosen
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
    showToast('Pickup code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClaimPayment = async () => {
    if (!sessionToken || !jobId) return;
    setClaimingPayment(true);
    try {
      await claimPayment(sessionToken, jobId);
      setJob((prev: any) => ({ ...prev, paymentState: 'CUSTOMER_CLAIMED_PAID' }));
      showToast('Payment claimed! Waiting for shopkeeper confirmation.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to claim payment', 'error');
    } finally {
      setClaimingPayment(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!sessionToken || !jobId) return;
    try {
      await cancelJob(sessionToken, jobId);
      setJob((prev: any) => ({ ...prev, status: 'CANCELLED' }));
      setIsCancelSheetOpen(false);
      showToast('Print order cancelled.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '100px', color: 'var(--text-dim)' }}>
        <div className="pulse-online-wrapper" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }}>
          <span className="pulse-online" style={{ width: '12px', height: '12px' }} />
        </div>
        <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>Tracking your print order...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <Card style={{ padding: '36px 20px', textAlign: 'center', marginTop: '40px', maxWidth: '480px', margin: '40px auto 0 auto' }}>
        <XCircle size={44} color="#e11d48" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>Order Not Found</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '20px' }}>{error || 'Unable to locate order.'}</p>
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
      </Card>
    );
  }

  const isPrinted = job.status === 'PRINTED';
  const isRejected = job.status === 'REJECTED';
  const isExpired = job.status === 'EXPIRED';
  const isFailed = job.status === 'FAILED_PRINT';
  const isCancelled = job.status === 'CANCELLED';
  const isTerminalError = isRejected || isExpired || isFailed || isCancelled;

  const currentStepIndex = STATUS_ORDER[job.status] ?? 0;

  const stepsConfig = [
    {
      index: 0,
      title: t.waitingShop,
      desc: t.shopReceivedOrder,
      icon: Clock,
    },
    {
      index: 1,
      title: t.accepted,
      desc: t.shopAcceptedOrder,
      icon: Check,
    },
    {
      index: 2,
      title: t.printing,
      desc: t.printingStarted,
      icon: Printer,
    },
    {
      index: 3,
      title: t.readyForPickup,
      desc: t.collectAtCounter,
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="animate-fade-in" style={{ width: '100%', paddingBottom: '32px' }}>
      {/* Step Indicator across checkout flow */}
      <StepIndicator currentStep={4} />

      {/* Pickup Code Hero Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 20px',
          textAlign: 'center',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          color: '#ffffff',
          boxShadow: '0 16px 36px rgba(79, 70, 229, 0.35)',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
          {t.pickupCode}
        </span>
        <div
          onClick={handleCopyCode}
          role="button"
          tabIndex={0}
          aria-label={`Pickup code ${job.code}, tap to copy`}
          style={{
            fontSize: 'clamp(2.8rem, 11vw, 3.8rem)',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            margin: '6px 0',
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
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: 'rgba(255, 255, 255, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {copiedCode ? <Check size={20} color="#ffffff" strokeWidth={3} /> : <Copy size={18} color="#ffffff" />}
          </div>
        </div>
        <p style={{ fontSize: '0.86rem', opacity: 0.95, fontWeight: 500, margin: 0 }}>
          {t.collectAtCounter}
        </p>
      </div>

      {/* Real-time Order Progress Stepper with Connecting Vertical Line */}
      <Card style={{ padding: '22px 20px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-main)' }}>
          {t.orderStatusTitle}
        </h4>

        {/* Calm Error State for Terminal statuses */}
        {isTerminalError ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: isCancelled ? '#f8fafc' : '#fff1f2',
              border: `1.5px solid ${isCancelled ? '#e2e8f0' : '#fecdd3'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertTriangle size={22} color={isCancelled ? '#64748b' : '#e11d48'} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '0.94rem', color: isCancelled ? '#0f172a' : '#9f1239', display: 'block', marginBottom: '4px' }}>
                {isCancelled ? t.orderCancelled : isRejected ? t.rejected : isExpired ? t.expired : t.printerIssue}
              </strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {t.errorNextAction}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stepsConfig.map((step, idx) => {
              const isDone = currentStepIndex > step.index || (currentStepIndex === 3 && step.index === 3);
              const isCurrent = currentStepIndex === step.index && !isDone;
              const isUpcoming = currentStepIndex < step.index;

              return (
                <div key={step.index} style={{ position: 'relative', display: 'flex', gap: '14px', paddingBottom: idx < stepsConfig.length - 1 ? '24px' : '0' }}>
                  {/* Connecting Vertical Progress Line */}
                  {idx < stepsConfig.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '17px',
                        top: '36px',
                        bottom: '0',
                        width: '3px',
                        background: currentStepIndex > step.index ? '#059669' : '#e2e8f0',
                        transition: 'background 0.3s ease',
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Step Icon Badge */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isDone
                        ? '#059669'
                        : isCurrent
                        ? '#4f46e5'
                        : '#f1f5f9',
                      color: isDone || isCurrent ? '#ffffff' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isCurrent
                        ? '0 0 0 5px rgba(79, 70, 229, 0.15)'
                        : isDone
                        ? '0 0 0 3px rgba(5, 150, 105, 0.12)'
                        : 'none',
                      flexShrink: 0,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {isDone ? (
                      <Check size={18} strokeWidth={3} />
                    ) : (
                      <step.icon size={18} />
                    )}
                  </div>

                  {/* Step Description */}
                  <div style={{ opacity: isUpcoming ? 0.45 : 1, transition: 'opacity 0.2s ease' }}>
                    <strong
                      style={{
                        fontSize: '0.94rem',
                        color: isDone ? '#059669' : isCurrent ? 'var(--accent-primary)' : 'var(--text-main)',
                        display: 'block',
                        fontWeight: 800,
                      }}
                    >
                      {step.title}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                      {step.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Post-Printing Zero-Trace Confirmation Notice */}
      {isPrinted && (
        <Card
          style={{
            padding: '16px 18px',
            marginBottom: '20px',
            background: '#ecfdf5',
            borderColor: '#a7f3d0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <ShieldCheck size={22} color="#059669" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: '0.9rem', color: '#065f46', display: 'block' }}>
              Zero-Trace Privacy Fulfilled
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#047857' }}>
              {t.filesDeletedNotice}
            </span>
          </div>
        </Card>
      )}

      {/* UPI Payment Section (if chosen) */}
      {job.paymentMode === 'UPI' && (
        <Card style={{ padding: '24px 20px', marginBottom: '20px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
            UPI Payment: ₹{(job.totals.pricePaise / 100).toFixed(2)}
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
            Scan with Google Pay, PhonePe, Paytm, or BHIM
          </p>

          {qrDataUrl && (
            <div
              style={{
                display: 'inline-block',
                padding: '14px',
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: 'var(--shadow-card)',
                margin: '6px 0 16px 0',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="UPI QR Code"
                style={{ width: '190px', height: '190px', display: 'block' }}
              />
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
                <Check size={20} strokeWidth={3} />
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
              <Button
                type="button"
                onClick={handleClaimPayment}
                isLoading={claimingPayment}
                style={{ width: '100%', minHeight: '48px' }}
              >
                <span>{t.iHavePaidUpi}</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Cancel Action if still waiting for shopkeeper */}
      {job.status === 'SUBMITTED' && (
        <button
          type="button"
          onClick={() => setIsCancelSheetOpen(true)}
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

      {/* In-App Cancel Confirmation Bottom Sheet (Not confirm()) */}
      <Sheet
        isOpen={isCancelSheetOpen}
        onClose={() => setIsCancelSheetOpen(false)}
        title="Cancel Print Order?"
      >
        <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '20px' }}>
          Are you sure you want to cancel this print order? The print shop will be notified.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => setIsCancelSheetOpen(false)}
            style={{ flex: 1 }}
          >
            Keep Order
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmCancel}
            style={{ flex: 1 }}
          >
            Yes, Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
