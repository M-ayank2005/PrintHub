'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Printer, Ban, X } from 'lucide-react';

export default function StandaloneToastPage() {
  const [job, setJob] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Read job payload passed via query params or window event
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code') || 'K7-42';
    const name = searchParams.get('name') || 'Customer';
    const amount = searchParams.get('amount') || '12.00';
    const pages = searchParams.get('pages') || '3';
    const sheets = searchParams.get('sheets') || '2';
    const mode = searchParams.get('mode') || 'COUNTER';
    const id = searchParams.get('id') || 'sample-id';

    setJob({ id, code, customerName: name, amount, pages, sheets, paymentMode: mode });
  }, []);

  const handleAccept = async () => {
    if (!job) return;
    setIsProcessing(true);
    try {
      await api.acceptJob(job.id);
      await api.getDownloadUrls(job.id);
      setTimeout(async () => {
        await api.updateJobStatus(job.id, 'PRINTED');
        window.close();
      }, 1500);
    } catch (e) {
      console.error(e);
      window.close();
    }
  };

  const handleReject = async () => {
    if (!job) return;
    try {
      await api.rejectJob(job.id, 'Busy');
    } catch (e) {
      console.error(e);
    } finally {
      window.close();
    }
  };

  if (!job) return null;

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#111827',
        borderRadius: '16px',
        border: '1px solid #6366f1',
        boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(99,102,241,0.3)',
        color: '#ffffff',
        fontFamily: 'var(--font-main)',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: '#818cf8' }}>
            {job.code}
          </span>
          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', fontWeight: 700 }}>
            {job.paymentMode}
          </span>
        </div>
        <button
          onClick={() => window.close()}
          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong style={{ fontSize: '1rem', display: 'block' }}>{job.customerName}</strong>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          {job.pages} pages ({job.sheets} sheets)
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
          ₹{job.amount}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={handleReject} className="biz-btn-danger" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
            <Ban size={14} />
            Reject
          </button>
          <button onClick={handleAccept} disabled={isProcessing} className="biz-btn-success" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Printer size={15} />
            {isProcessing ? 'Printing...' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
