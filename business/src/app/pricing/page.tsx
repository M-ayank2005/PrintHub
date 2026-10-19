'use client';

import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../lib/store';
import { api } from '../../lib/api';
import { Tag, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PRINT_CATALOG_KEYS, PrintCatalogKey } from '@printhub/shared';

export default function PricingPage() {
  const { business, setBusiness, printers, selectedPrinter } = useBusinessStore();
  const [pricing, setPricing] = useState<Record<string, { enabled: boolean; pricePaise: number }>>({});
  const [scanFee, setScanFee] = useState<number>(0);
  const [minOrder, setMinOrder] = useState<number>(0);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active printer capabilities check (F9)
  const activePrinter = printers.find((p) => p.name === selectedPrinter);
  const canColor = activePrinter ? activePrinter.isColor : true;
  const canDuplex = activePrinter ? activePrinter.isDuplex : true;

  useEffect(() => {
    if (business) {
      setPricing(business.pricing || {});
      setScanFee((business.extras?.scanFeePerPage || 0) / 100);
      setMinOrder((business.extras?.minimumOrder || 0) / 100);
    }
  }, [business]);

  const handlePriceChange = (key: string, rupees: number) => {
    setPricing((prev) => ({
      ...prev,
      [key]: {
        enabled: prev[key]?.enabled ?? true,
        pricePaise: Math.round(rupees * 100),
      },
    }));
  };

  const handleToggleEnabled = (key: string) => {
    setPricing((prev) => ({
      ...prev,
      [key]: {
        enabled: !prev[key]?.enabled,
        pricePaise: prev[key]?.pricePaise || 200,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        pricing,
        extras: {
          scanFeePerPage: Math.round(scanFee * 100),
          minimumOrder: Math.round(minOrder * 100),
        },
      };

      const res = await api.updatePricing(payload);
      setBusiness(res.business);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const catalogItems = [
    { key: 'A4_BW_SINGLE', label: 'A4 Black & White (Single Side)', unit: 'per printed side', requiresColor: false, requiresDuplex: false },
    { key: 'A4_BW_DOUBLE', label: 'A4 Black & White (Duplex / Both Sides)', unit: 'per sheet', requiresColor: false, requiresDuplex: true },
    { key: 'A4_COLOR_SINGLE', label: 'A4 Colour (Single Side)', unit: 'per printed side', requiresColor: true, requiresDuplex: false },
    { key: 'A4_COLOR_DOUBLE', label: 'A4 Colour (Duplex / Both Sides)', unit: 'per sheet', requiresColor: true, requiresDuplex: true },
    { key: 'A3_BW_SINGLE', label: 'A3 Black & White', unit: 'per printed side', requiresColor: false, requiresDuplex: false },
    { key: 'A3_COLOR_SINGLE', label: 'A3 Colour', unit: 'per printed side', requiresColor: true, requiresDuplex: false },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Pricing & Catalog Configuration
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
            Set authoritative rates for customer print orders. Prices are validated server-side and locked as immutable snapshots per job.
          </p>
        </div>

        {savedSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
            <CheckCircle2 size={18} />
            <span>Pricing Updated Successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave}>
        <div className="biz-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '18px' }}>Print Types Rates</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {catalogItems.map((item) => {
              const itemConfig = pricing[item.key] || { enabled: false, pricePaise: 200 };
              const isEnabled = itemConfig.enabled;
              const priceRupees = (itemConfig.pricePaise / 100).toFixed(2);

              const isDisabledByHardware = (item.requiresColor && !canColor) || (item.requiresDuplex && !canDuplex);

              return (
                <div
                  key={item.key}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: isEnabled ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <input
                      type="checkbox"
                      checked={isEnabled && !isDisabledByHardware}
                      disabled={isDisabledByHardware}
                      onChange={() => handleToggleEnabled(item.key)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: isEnabled ? '#ffffff' : '#94a3b8' }}>
                        {item.label}
                      </strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                        {item.unit}
                      </span>
                      {isDisabledByHardware && (
                        <span style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <AlertTriangle size={12} />
                          Selected default printer does not support {item.requiresColor ? 'colour' : 'duplex'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="500"
                      disabled={!isEnabled || isDisabledByHardware}
                      value={priceRupees}
                      onChange={(e) => handlePriceChange(item.key, parseFloat(e.target.value) || 0)}
                      style={{
                        width: '90px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        textAlign: 'right',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Extras & Thresholds */}
        <div className="biz-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '18px' }}>Extras & Minimum Orders</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Camera Scan Fee (per scanned page)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>₹</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={scanFee}
                  onChange={(e) => setScanFee(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Minimum Order Amount (₹)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>₹</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={minOrder}
                  onChange={(e) => setMinOrder(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="biz-btn-primary"
          style={{ padding: '14px 28px', fontSize: '1rem' }}
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Pricing Catalog'}
        </button>
      </form>
    </div>
  );
}
