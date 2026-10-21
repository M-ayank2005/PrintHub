'use client';

import React, { useState } from 'react';
import { useBusinessStore } from '../../lib/store';
import { api } from '../../lib/api';
import { Inbox, Printer, Ban, PauseCircle, PlayCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

export default function RequestsPage() {
  const { pendingJobs, setPendingJobs, updateJob, business, setBusiness } = useBusinessStore();
  const [busyState, setBusyState] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [toggleFeedback, setToggleFeedback] = useState<string | null>(null);

  const fetchPendingJobs = async () => {
    setIsFetching(true);
    try {
      const res = await api.getJobs('SUBMITTED');
      if (res?.jobs) {
        setPendingJobs(
          res.jobs.map((j: any) => ({
            id: (j.id || j._id)?.toString(),
            code: j.code,
            customerName: j.customerName,
            paymentMode: j.paymentMode,
            paymentState: j.paymentState,
            totals: j.totals,
            docsCount: j.docsCount || j.docs?.length || 0,
            createdAt: j.createdAt,
            expiresAt: j.expiresAt,
            status: j.status || 'SUBMITTED',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load pending jobs:', err);
    } finally {
      setIsFetching(false);
    }
  };

  React.useEffect(() => {
    fetchPendingJobs();
  }, []);

  // Ensure business profile is loaded even on direct page visit
  React.useEffect(() => {
    if (!business) {
      api.getProfile()
        .then((res) => {
          if (res?.business) setBusiness(res.business);
        })
        .catch((err) => console.error('Failed to load profile in requests page:', err));
    }
  }, [business, setBusiness]);

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
    if (isTogglingPause) return;
    setIsTogglingPause(true);
    setToggleFeedback(null);
    try {
      const currentPaused = !!business?.acceptPaused;
      const nextPaused = !currentPaused;
      const res = await api.updateProfile({ acceptPaused: nextPaused });
      if (res?.business) {
        setBusiness(res.business);
      } else {
        setBusiness({ ...business, acceptPaused: nextPaused });
      }
      setToggleFeedback(
        nextPaused
          ? 'Queue Paused: New customer submissions are temporarily paused.'
          : 'Queue Resumed: Now accepting live print requests!'
      );
      setTimeout(() => setToggleFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle pause status');
    } finally {
      setIsTogglingPause(false);
    }
  };

  const isPaused = !!business?.acceptPaused;

  return (
    <div>
      {/* Header with Compact Pause Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Incoming Print Requests
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Live print queue from customer QR scans. One click to accept and print silently.
          </p>
        </div>

        {/* Header Controls: Refresh and Pause Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={fetchPendingJobs}
            disabled={isFetching}
            className="biz-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '0.84rem' }}
            title="Refresh pending requests list"
          >
            <RefreshCw size={15} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={handleTogglePause}
            disabled={isTogglingPause}
            role="switch"
            aria-checked={!isPaused}
            title={isPaused ? 'Click to resume accepting incoming print requests' : 'Click to pause incoming requests when shop is busy'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px 6px 12px',
              borderRadius: '9999px',
              background: 'var(--bg-card)',
              border: isPaused ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
              cursor: isTogglingPause ? 'wait' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isPaused ? '0 2px 8px rgba(244, 63, 94, 0.12)' : 'var(--shadow-card)',
              opacity: isTogglingPause ? 0.7 : 1,
            }}
          >
            {/* Pulsing Status Dot */}
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isPaused ? '#f43f5e' : '#10b981',
                boxShadow: isPaused
                  ? '0 0 0 3px rgba(244, 63, 94, 0.2)'
                  : '0 0 0 3px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s ease',
              }}
            />

            {/* Status Label */}
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: isPaused ? '#f43f5e' : 'var(--text-primary)',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              {isPaused ? 'Queue Paused (Busy)' : 'Accepting Requests'}
            </span>

            {/* Slider Track and Thumb */}
            <div
              style={{
                width: '36px',
                height: '20px',
                borderRadius: '10px',
                background: isPaused ? '#64748b' : '#10b981',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s ease',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                  transform: isPaused ? 'translateX(0px)' : 'translateX(16px)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Real-time Toggle Feedback */}
      {toggleFeedback && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            background: isPaused ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: isPaused ? '1px solid rgba(244, 63, 94, 0.28)' : '1px solid rgba(16, 185, 129, 0.28)',
            color: isPaused ? '#f43f5e' : '#10b981',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          {toggleFeedback}
        </div>
      )}

      {/* Paused Warning Banner */}
      {isPaused && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderRadius: '12px',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem' }}>⏸</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              Queue is currently paused. Customers scanning your QR poster are notified that the shop is temporarily busy.
            </span>
          </div>
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={isTogglingPause}
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#10b981',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              whiteSpace: 'nowrap',
              marginLeft: '12px',
            }}
          >
            Resume Queue
          </button>
        </div>
      )}

      {/* Requests List */}
      {pendingJobs.length === 0 ? (
        <div className="biz-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Inbox size={48} color="#64748b" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>No Pending Requests</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
                  borderLeft: '4px solid var(--accent-indigo)',
                }}
              >
                {/* Left: Code, Name, Document Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.8rem',
                      fontWeight: 800,
                      color: 'var(--accent-indigo)',
                      letterSpacing: '0.05em',
                      minWidth: '100px',
                    }}
                  >
                    {job.code}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
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

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {job.totals?.documents} documents • {job.totals?.pages} pages ({job.totals?.sheets} sheets){' '}
                      • {job.totals?.bwSheets > 0 ? `${job.totals.bwSheets} B&W sheets` : ''}{' '}
                      {job.totals?.colorSheets > 0 ? `${job.totals.colorSheets} Colour sheets` : ''}
                    </div>
                  </div>
                </div>

                {/* Right: Total Price & 1-Click Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Order Total</span>
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
