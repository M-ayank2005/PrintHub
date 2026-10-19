'use client';

import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../lib/store';
import { api } from '../../lib/api';
import { Settings, Save, CheckCircle2, LogOut, Store, CreditCard, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { business, setBusiness } = useBusinessStore();

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
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Shop Settings & UPI
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
            Configure your cafe profile, UPI VPA for mobile payments, and print workflow behavior.
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
        <div style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', color: '#fca5a5', fontSize: '0.85rem', borderRadius: '10px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Profile Card */}
        <div className="biz-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={18} color="#818cf8" />
            Shop Information
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Shop Name *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Address / Location (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Near University Gate No. 2, Lucknow"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* UPI Payments Card */}
        <div className="biz-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} color="#06b6d4" />
            UPI Payment Receiver
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Shop UPI ID (VPA)
              </label>
              <input
                type="text"
                placeholder="e.g. cyberprints@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Used to generate direct UPI intent links and QR codes on the customer phone.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Payee Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Cyber Prints & Xerox"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* Workflow Controls Card */}
        <div className="biz-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#10b981" />
            Print Workflow Controls
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#ffffff', display: 'block' }}>
                  Print Immediately (Default)
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Start silent printing as soon as you click Accept, without waiting for advance payment confirmation.
                </span>
              </div>
              <input
                type="checkbox"
                checked={printBeforePayment}
                onChange={(e) => setPrintBeforePayment(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#ffffff', display: 'block' }}>
                  Pause Incoming Requests
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Temporarily blocks new submissions when your shop is crowded or closing.
                </span>
              </div>
              <input
                type="checkbox"
                checked={acceptPaused}
                onChange={(e) => setAcceptPaused(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
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
