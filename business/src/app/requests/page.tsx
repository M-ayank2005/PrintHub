'use client';

import React, { useState } from 'react';
import { useBusinessStore } from '../../lib/store';
import { api } from '../../lib/api';
import { Inbox, Printer, Ban, PauseCircle, PlayCircle, CheckCircle2, Clock } from 'lucide-react';

export default function RequestsPage() {
  const { pendingJobs, updateJob, business, setBusiness } = useBusinessStore();
  const [busyState, setBusyState] = useState<string | null>(null);

  const handleAccept = async (jobId: string) => {
    try {
      setBusyState(jobId);
      await api.acceptJob(jobId);
      updateJob(jobId, 'ACCEPTED');

      // Fetch download URLs to simulate silent printing
      const downloadData = await api.getDownloadUrls(jobId);
      console.log('Sending job to Windows spooler:', downloadData);

      setTimeout(async () => {
        try {
          await api.updateJobStatus(jobId, 'PRINTED');
          updateJob(jobId, 'PRINTED');
        } catch (e) {
          console.error(e);
        }
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to accept job');
    } finally {
      setBusyState(null);
    }
  };

  const handleReject = async (jobId: string) => {
    const reason = prompt('Optional rejection reason (or leave empty):', 'Shop is busy');
    if (reason === null) return;

    try {
      setBusyState(jobId);
      await api.rejectJob(jobId, reason || 'Shopkeeper busy');
      updateJob(jobId, 'REJECTED');
    } catch (err: any) {
      alert(err.message || 'Failed to reject job');
    } finally {
      setBusyState(null);
    }
  };

  const handleTogglePause = async () => {
    if (!business) return;
    try {
      const nextPaused = !business.acceptPaused;
      const res = await api.updateProfile({ acceptPaused: nextPaused });
      setBusiness(res.business);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle pause status');
    }
  };

  const isPaused = !!business?.acceptPaused;

  return (
    <div>
      {/* Header with Pause Switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Incoming Print Requests
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
            Live print queue from customer QR scans. One click to accept and print silently.
          </p>
        </div>

        <button
          onClick={handleTogglePause}
          className={isPaused ? 'biz-btn-success' : 'biz-btn-danger'}
          style={{ padding: '12px 20px' }}
        >
          {isPaused ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
          {isPaused ? 'Resume Incoming Requests' : 'Pause Requests (Shop Busy)'}
        </button>
      </div>

      {/* Requests List */}
      {pendingJobs.length === 0 ? (
        <div className="biz-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Inbox size={48} color="#64748b" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>No Pending Requests</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            When a customer scans your counter QR poster and submits an order, it will appear here immediately.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {pendingJobs.map((job) => {
            const priceRupees = (job.totals?.pricePaise / 100).toFixed(2);
            const isProcessing = busyState === job.id;

            return (
              <div
                key={job.id}
                className="biz-card"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: '4px solid #6366f1',
                }}
              >
                {/* Left: Code, Name, Document Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.8rem',
                      fontWeight: 800,
                      color: '#818cf8',
                      letterSpacing: '0.05em',
                      minWidth: '100px',
                    }}
                  >
                    {job.code}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>
                        {job.customerName}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: job.paymentMode === 'UPI' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: job.paymentMode === 'UPI' ? '#06b6d4' : '#f59e0b',
                        }}
                      >
                        {job.paymentMode === 'UPI' ? 'Pay via UPI' : 'Pay at Counter'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                      {job.totals?.documents} documents • {job.totals?.pages} pages ({job.totals?.sheets} sheets){' '}
                      • {job.totals?.bwSheets > 0 ? `${job.totals.bwSheets} B&W sheets` : ''}{' '}
                      {job.totals?.colorSheets > 0 ? `${job.totals.colorSheets} Colour sheets` : ''}
                    </div>
                  </div>
                </div>

                {/* Right: Total Price & 1-Click Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Order Total</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
                      ₹{priceRupees}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => handleReject(job.id)}
                      disabled={isProcessing}
                      className="biz-btn-danger"
                    >
                      <Ban size={15} />
                      Reject
                    </button>

                    <button
                      onClick={() => handleAccept(job.id)}
                      disabled={isProcessing}
                      className="biz-btn-success"
                      style={{ padding: '12px 22px', fontSize: '0.95rem' }}
                    >
                      <Printer size={18} />
                      {isProcessing ? 'Spooling...' : 'Accept & Print'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
