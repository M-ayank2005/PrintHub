'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessStore } from '../lib/store';
import { api } from '../lib/api';
import { Printer, X, Ban, ArrowUpRight } from 'lucide-react';

export const ToastStack: React.FC = () => {
  const router = useRouter();
  const { toastJobs, dismissToast, updateJob } = useBusinessStore();

  // Auto-dismiss toasts after 12 seconds
  useEffect(() => {
    if (toastJobs.length > 0) {
      const timers = toastJobs.map((job) =>
        setTimeout(() => {
          dismissToast(job.id);
        }, 12000)
      );
      return () => timers.forEach((t) => clearTimeout(t));
    }
  }, [toastJobs, dismissToast]);

  const handleAccept = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.acceptJob(jobId);
      updateJob(jobId, 'ACCEPTED');

      // Fetch download URLs to simulate/trigger silent printing
      const downloadData = await api.getDownloadUrls(jobId);
      console.log('Spooling job to local default printer:', downloadData);

      // Simulate instantaneous spooler dispatch -> PRINTED
      setTimeout(async () => {
        try {
          await api.updateJobStatus(jobId, 'PRINTED');
          updateJob(jobId, 'PRINTED');
        } catch (err) {
          console.error(err);
        }
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to accept job');
    }
  };

  const handleReject = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = prompt('Optional rejection reason (or leave empty):', 'Shop is busy');
    if (reason === null) return;
    try {
      await api.rejectJob(jobId, reason || 'Shopkeeper is currently busy');
      updateJob(jobId, 'REJECTED');
    } catch (err: any) {
      alert(err.message || 'Failed to reject job');
    }
  };

  const handleCardClick = (jobId: string) => {
    router.push('/requests');
    dismissToast(jobId);
  };

  if (toastJobs.length === 0) return null;

  return (
    <div className="toast-stack">
      {toastJobs.map((job) => {
        const priceRupees = ((job.totals?.pricePaise || 0) / 100).toFixed(2);
        return (
          <div
            key={job.id}
            className="toast-item"
            onClick={() => handleCardClick(job.id)}
            style={{
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            title="Click to open incoming print request"
          >
            {/* Header: Code and Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--accent-indigo)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {job.code}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: job.paymentMode === 'UPI' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: job.paymentMode === 'UPI' ? 'var(--accent-cyan)' : 'var(--accent-amber)',
                    fontWeight: 700,
                  }}
                >
                  {job.paymentMode === 'UPI' ? 'UPI' : 'COUNTER'}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--accent-indigo)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontWeight: 600,
                  }}
                >
                  Open <ArrowUpRight size={12} />
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(job.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Dismiss toast"
              >
                <X size={16} />
              </button>
            </div>

            {/* Customer & Job details */}
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)', display: 'block' }}>
                {job.customerName || 'Customer'}
              </strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {job.totals?.pages || 1} pages ({job.totals?.sheets || 1} sheets)
                {job.totals?.bwSheets > 0 ? ` • ${job.totals.bwSheets} B&W` : ''}
                {job.totals?.colorSheets > 0 ? ` • ${job.totals.colorSheets} Colour` : ''}
              </span>
            </div>

            {/* Total Price and Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                ₹{priceRupees}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={(e) => handleReject(job.id, e)}
                  className="biz-btn-danger"
                  style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                >
                  <Ban size={13} />
                  Reject
                </button>

                <button
                  type="button"
                  onClick={(e) => handleAccept(job.id, e)}
                  className="biz-btn-success"
                  style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                >
                  <Printer size={14} />
                  Accept & Print
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
