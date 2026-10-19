'use client';

import React from 'react';
import { useBusinessStore } from '../lib/store';
import { api } from '../lib/api';
import { Printer, X, Check, FileText, Ban } from 'lucide-react';

export const ToastStack: React.FC = () => {
  const { toastJobs, dismissToast, updateJob } = useBusinessStore();

  const handleAccept = async (jobId: string) => {
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
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to accept job');
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      await api.rejectJob(jobId, 'Shopkeeper is currently busy');
      updateJob(jobId, 'REJECTED');
    } catch (err: any) {
      alert(err.message || 'Failed to reject job');
    }
  };

  if (toastJobs.length === 0) return null;

  return (
    <div className="toast-stack">
      {toastJobs.map((job) => {
        const priceRupees = (job.totals.pricePaise / 100).toFixed(2);
        return (
          <div key={job.id} className="toast-item">
            {/* Header: Code and Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#818cf8',
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
                    background: job.paymentMode === 'UPI' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: job.paymentMode === 'UPI' ? '#06b6d4' : '#f59e0b',
                    fontWeight: 700,
                  }}
                >
                  {job.paymentMode === 'UPI' ? 'UPI' : 'COUNTER'}
                </span>
              </div>
              <button
                onClick={() => dismissToast(job.id)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Customer & Job details */}
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.95rem', color: '#ffffff', display: 'block' }}>
                {job.customerName}
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {job.totals.pages} pages ({job.totals.sheets} sheets) • {job.totals.bwSheets > 0 ? `${job.totals.bwSheets} B&W` : ''}{' '}
                {job.totals.colorSheets > 0 ? `${job.totals.colorSheets} Colour` : ''}
              </span>
            </div>

            {/* Total Price and Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                ₹{priceRupees}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleReject(job.id)}
                  className="biz-btn-danger"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <Ban size={14} />
                  Reject
                </button>

                <button
                  onClick={() => handleAccept(job.id)}
                  className="biz-btn-success"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  <Printer size={15} />
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
