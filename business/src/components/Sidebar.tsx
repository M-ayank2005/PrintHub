'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBusinessStore } from '../lib/store';
import {
  Inbox,
  LayoutDashboard,
  Printer,
  Tag,
  QrCode,
  Settings,
  Bell,
  BellOff,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { pendingJobs, isConnected, selectedPrinter, isDND, toggleDND, business } = useBusinessStore();

  const navItems = [
    { label: 'Requests', href: '/requests', icon: Inbox, count: pendingJobs.length },
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Printers', href: '/printers', icon: Printer },
    { label: 'Pricing & Catalog', href: '/pricing', icon: Tag },
    { label: 'QR Poster', href: '/poster', icon: QrCode },
    { label: 'Settings & UPI', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        flexShrink: 0,
      }}
    >
      <div>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px 8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Printer size={20} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>PrintHub</h2>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {business?.shopName || 'Desktop Agent'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.4)' : 'transparent'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={isActive ? '#818cf8' : '#64748b'} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    style={{
                      background: '#6366f1',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info: Printer, Audio, Connection */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Do Not Disturb</span>
          <button
            onClick={toggleDND}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isDND ? '#f43f5e' : '#10b981',
            }}
          >
            {isDND ? <BellOff size={16} /> : <Bell size={16} />}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#94a3b8', padding: '0 4px' }}>
          {isConnected ? (
            <>
              <Wifi size={14} color="#10b981" />
              <span>Gateway Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={14} color="#f59e0b" />
              <span>Connecting to API...</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
