'use client';

import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../lib/store';
import { api } from '../../lib/api';
import {
  Settings,
  Save,
  CheckCircle2,
  LogOut,
  Store,
  CreditCard,
  Shield,
  Sun,
  Moon,
  Palette,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { business, setBusiness, theme, setTheme } = useBusinessStore();

  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [acceptPaused, setAcceptPaused] = useState(false);
  const [printBeforePayment, setPrintBeforePayment] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setShopName(business.shopName || '');
      setAddress(business.address || '');
      setUpiId(business.upiId || '');
      setPayeeName(business.payeeName || '');
      setAcceptPaused(!!business.acceptPaused);
      setPrintBeforePayment(business.printBeforePayment !== false);
    }
  }, [business]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validate UPI ID if entered
    if (upiId && !/^[\w.\-]+@[\w.\-]+$/.test(upiId.trim())) {
      setError('Invalid UPI ID format (e.g. yourname@okaxis or cafe@upi)');
      setIsSaving(false);
      return;
    }

    try {
      const res = await api.updateProfile({
        shopName: shopName.trim(),
        address: address.trim() || undefined,
        upiId: upiId.trim() || null,
        payeeName: payeeName.trim() || undefined,
        acceptPaused,
        printBeforePayment,
      });

      setBusiness(res.business);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out from this desktop agent?')) {
      api.logout();
      window.location.reload();
    }
  };

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Shop Settings & Appearance
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
            Configure your desktop app theme, counter profile, UPI receiver, and automated print rules.
          </p>
        </div>

        {savedSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
            <CheckCircle2 size={18} />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', color: '#fca5a5', fontSize: '0.85rem', borderRadius: '12px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Theme & Display Mode Selector */}
      <div className="biz-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <Palette size={18} color="var(--accent-indigo)" />
          Theme & Display Mode
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Choose your desktop agent workspace theme. Changes apply immediately and persist across sessions.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Dark Mode Card */}
          <div
            onClick={() => setTheme('dark')}
            style={{
              padding: '16px 18px',
              borderRadius: '14px',
              background: theme === 'dark' ? 'rgba(99, 102, 241, 0.12)' : 'var(--btn-secondary-bg)',
              border: `2px solid ${theme === 'dark' ? 'var(--accent-indigo)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.18s ease',
              boxShadow: theme === 'dark' ? '0 4px 18px rgba(99, 102, 241, 0.25)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#0b0f19',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                <Moon size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                  Dark Control Center
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Low glare for long shifts
                </span>
              </div>
            </div>

            {theme === 'dark' && (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Check size={14} />
              </div>
            )}
          </div>

          {/* Light Mode Card */}
          <div
            onClick={() => setTheme('light')}
            style={{
              padding: '16px 18px',
              borderRadius: '14px',
              background: theme === 'light' ? 'rgba(79, 70, 229, 0.1)' : 'var(--btn-secondary-bg)',
              border: `2px solid ${theme === 'light' ? 'var(--accent-indigo)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.18s ease',
              boxShadow: theme === 'light' ? '0 4px 18px rgba(79, 70, 229, 0.2)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <Sun size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                  Light Studio Mode
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Daylight enterprise view
                </span>
              </div>
            </div>

            {theme === 'light' && (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Check size={14} />
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Profile Card */}
        <div className="biz-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Store size={18} color="var(--accent-indigo)" />
            Shop Information
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Shop Name *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="biz-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Address / Location (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Near University Gate No. 2, Lucknow"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="biz-input"
              />
            </div>
          </div>
        </div>

        {/* UPI Payments Card */}
        <div className="biz-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <CreditCard size={18} color="var(--accent-cyan)" />
            UPI Payment Receiver
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Shop UPI ID (VPA)
              </label>
              <input
                type="text"
                placeholder="e.g. cyberprints@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="biz-input"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                Used to generate direct UPI intent links and dynamic QR codes on customer phones.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Payee Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Cyber Prints & Xerox"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="biz-input"
              />
            </div>
          </div>
        </div>

        {/* Workflow Controls Card */}
        <div className="biz-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Shield size={18} color="var(--accent-emerald)" />
            Print Workflow Controls
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>
                  Print Immediately (Default)
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Start silent printing as soon as you click Accept, without waiting for advance payment confirmation.
                </span>
              </div>
              <input
                type="checkbox"
                checked={printBeforePayment}
                onChange={(e) => setPrintBeforePayment(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-indigo)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>
                  Pause Incoming Requests
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Temporarily blocks new submissions when your shop is crowded or closing.
                </span>
              </div>
              <input
                type="checkbox"
                checked={acceptPaused}
                onChange={(e) => setAcceptPaused(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-indigo)' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="submit"
            disabled={isSaving}
            className="biz-btn-primary"
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="biz-btn-danger"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </form>
    </div>
  );
}
