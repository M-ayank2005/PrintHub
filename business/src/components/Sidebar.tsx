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
  Sun,
  Moon,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { pendingJobs, isConnected, isDND, toggleDND, business, theme, toggleTheme } = useBusinessStore();

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
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px 8px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'var(--accent-indigo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              color: '#ffffff',
            }}
          >
            <Printer size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>PrintHub</h2>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
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
                  padding: '11px 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--border-active)' : 'transparent'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={isActive ? 'var(--accent-indigo)' : 'var(--text-tertiary)'} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    style={{
                      background: 'var(--accent-indigo)',
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

      {/* Footer Info: Theme Toggle, Audio, Connection */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        {/* Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Theme Mode</span>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              color: theme === 'dark' ? '#818cf8' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        </div>

        {/* DND Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Do Not Disturb</span>
          <button
            onClick={toggleDND}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isDND ? '#f43f5e' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            {isDND ? <BellOff size={16} /> : <Bell size={16} />}
          </button>
        </div>

        {/* Live Gateway Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0 4px' }}>
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
