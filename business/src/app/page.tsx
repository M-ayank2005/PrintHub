'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useBusinessStore } from '../lib/store';
import { DollarSign, FileText, CheckCircle2, Download, Printer, TrendingUp, Layers } from 'lucide-react';

export default function DashboardPage() {
  const { business } = useBusinessStore();
  const [stats, setStats] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getStats(7);
        setStats(data.stats || []);
        setRecentJobs(data.recentJobs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleMarkPaid = async (jobId: string) => {
    try {
      await api.markPaid(jobId);
      setRecentJobs((prev) =>
        prev.map((j) => (j._id === jobId ? { ...j, paymentState: 'PAID_CONFIRMED' } : j))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update payment');
    }
  };

  const handleExportCsv = () => {
    if (recentJobs.length === 0) return;
    const headers = ['Code', 'Customer Name', 'Pages', 'Sheets', 'Total (INR)', 'Payment Mode', 'Payment State', 'Status', 'Date'];
    const rows = recentJobs.map((j) => [
      j.code,
      `"${j.customerName}"`,
      j.totals?.pages || 0,
      j.totals?.sheets || 0,
      ((j.totals?.pricePaise || 0) / 100).toFixed(2),
      j.paymentMode,
      j.paymentState,
      j.status,
      new Date(j.createdAt).toLocaleString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `printhub-jobs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todayStats = stats[stats.length - 1] || {};
  const totalRevenuePaise = (todayStats.revenueConfirmedPaise || 0) + (todayStats.revenuePendingPaise || 0);

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Dashboard Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Live performance, revenue, and recent jobs for {business?.shopName || 'your shop'}
          </p>
        </div>

        <button onClick={handleExportCsv} className="biz-btn-secondary">
          <Download size={16} />
          Export CSV Report
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {/* Card 1: Revenue */}
        <div className="biz-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Today&apos;s Revenue</span>
            <DollarSign size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{(totalRevenuePaise / 100).toFixed(2)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
            ₹{((todayStats.revenueConfirmedPaise || 0) / 100).toFixed(2)} confirmed
          </span>
        </div>

        {/* Card 2: Print Jobs */}
        <div className="biz-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Completed Jobs</span>
            <Printer size={18} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {todayStats.jobs || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {todayStats.rejected || 0} rejected • {todayStats.expired || 0} expired
          </span>
        </div>

        {/* Card 3: Sheets Printed */}
        <div className="biz-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Sheets</span>
            <Layers size={18} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {todayStats.sheets || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {todayStats.bwSheets || 0} B&W • {todayStats.colorSheets || 0} Colour
          </span>
        </div>

        {/* Card 4: Pages */}
        <div className="biz-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Pages</span>
            <FileText size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {todayStats.pages || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Across all customer submissions
          </span>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="biz-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Recent Print Orders</h3>

        {recentJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
            No print jobs recorded yet today.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8' }}>
                <th style={{ padding: '12px 14px' }}>Pickup Code</th>
                <th style={{ padding: '12px 14px' }}>Customer Name</th>
                <th style={{ padding: '12px 14px' }}>Sheets</th>
                <th style={{ padding: '12px 14px' }}>Amount</th>
                <th style={{ padding: '12px 14px' }}>Payment</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Time</th>
                <th style={{ padding: '12px 14px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((j) => (
                <tr key={j._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#818cf8' }}>
                    {j.code}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {j.customerName}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                    {j.totals?.sheets || 0} ({j.totals?.pages || 0} pages)
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#10b981' }}>
                    ₹{((j.totals?.pricePaise || 0) / 100).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: j.paymentState === 'PAID_CONFIRMED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: j.paymentState === 'PAID_CONFIRMED' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {j.paymentState}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: j.status === 'PRINTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: j.status === 'PRINTED' ? '#10b981' : '#818cf8',
                      }}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>
                    {new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {j.paymentState !== 'PAID_CONFIRMED' && (
                      <button
                        onClick={() => handleMarkPaid(j._id)}
                        className="biz-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
