'use client';

import React, { useEffect, useState } from 'react';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { ToastStack } from '../components/ToastStack';
import { PrinterLoader } from '../components/PrinterLoader';
import { initBusinessSocket, disconnectSocket } from '../lib/socket';
import { useBusinessStore } from '../lib/store';
import { api, getAuthToken, removeAuthToken } from '../lib/api';
import { getOrCreateDeviceId, getDeviceName } from '../lib/device';
import { Printer, Sun, Moon } from 'lucide-react';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setBusiness, setConnected, addJob, updateJob, isDND, theme, setTheme, toggleTheme } = useBusinessStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Restore saved theme
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('printhub_biz_theme') as 'dark' | 'light' | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    }

    const token = getAuthToken();
    if (token) {
      const startTime = Date.now();
      fetchProfile()
        .then(async () => {
          setIsAuthenticated(true);
          const agentInfo = await registerBusinessAgent();
          setupSocket(agentInfo?.deviceId, agentInfo?.printerCaps);
        })
        .catch((err) => {
          console.warn('Session verification failed, logging out:', err);
          removeAuthToken();
          setIsAuthenticated(false);
        })
        .finally(() => {
          const elapsed = Date.now() - startTime;
          const minDelay = Math.max(0, 700 - elapsed);
          setTimeout(() => {
            setIsCheckingAuth(false);
          }, minDelay);
        });
    } else {
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  const registerBusinessAgent = async () => {
    try {
      const deviceId = getOrCreateDeviceId();
      const deviceName = getDeviceName();

      let printersList: any[] = [];
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          printersList = await invoke<any[]>('get_system_printers');
        }
      } catch (e) {
        // Fallback to backend printer scan if running in browser
      }

      if (!printersList || printersList.length === 0) {
        try {
          const res = await api.getSystemPrinters();
          printersList = res.printers || [];
        } catch (e) {
          // ignore
        }
      }

      const printerCaps = (printersList.length > 0 ? printersList : [
        {
          name: 'Windows Default Printer',
          isDefault: true,
          isOnline: true,
          isColor: true,
          isDuplex: true,
          paperSizes: ['A4'],
        },
      ]).map((p: any) => ({
        name: p.name || 'Printer',
        isDefault: !!(p.isDefault ?? p.is_default),
        isOnline: p.isOnline ?? p.is_online ?? true,
        isColor: !!(p.isColor ?? p.is_color),
        isDuplex: !!(p.isDuplex ?? p.is_duplex),
        paperSizes: Array.isArray(p.paperSizes || p.paper_sizes) ? (p.paperSizes || p.paper_sizes) : ['A4'],
      }));

      await api.registerAgent({
        deviceId,
        deviceName,
        printerCaps,
        forceTakeover: true,
      });

      return { deviceId, printerCaps };
    } catch (err) {
      console.error('Failed to register business agent:', err);
      return null;
    }
  };

  const setupSocket = (deviceId?: string, caps?: any[]) => {
    const activeDeviceId = deviceId || getOrCreateDeviceId();
    initBusinessSocket(
      (job) => {
        addJob(job);
        // Play gentle audio chime if not DND
        if (!isDND && typeof window !== 'undefined' && window.AudioContext) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
          } catch (e) {
            console.error(e);
          }
        }
      },
      (update) => {
        updateJob(update.jobId, update.status, update.paymentState);
      },
      undefined,
      activeDeviceId,
      () => caps || []
    );
    setConnected(true);
  };

  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      setBusiness(data.business);
      return data.business;
    } catch (err) {
      console.error('Failed to fetch profile', err);
      throw err;
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const deviceId = getOrCreateDeviceId();
      if (authMode === 'signup') {
        if (!shopName.trim()) {
          throw new Error('Please enter your shop or cafe name.');
        }
        await api.signup(email.trim(), password, shopName.trim(), deviceId);
      } else {
        await api.login(email.trim(), password, deviceId);
      }
      setIsAuthenticated(true);
      await fetchProfile();
      const agentInfo = await registerBusinessAgent();
      setupSocket(agentInfo?.deviceId, agentInfo?.printerCaps);
    } catch (err: any) {
      setAuthError(err.message || (authMode === 'signup' ? 'Registration failed' : 'Login failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <head>
        <title>PrintHub Business Control Center</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('printhub_biz_theme');
                  if (saved === 'light' || saved === 'dark') {
                    document.documentElement.setAttribute('data-theme', saved);
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        {isCheckingAuth ? (
          <PrinterLoader />
        ) : !isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', background: 'var(--bg-app)' }}>
            <div className="biz-card" style={{ maxWidth: '440px', width: '100%', padding: '36px 32px', position: 'relative' }}>
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'var(--btn-secondary-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: 'var(--accent-indigo)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto',
                    boxShadow: '0 8px 24px var(--accent-indigo-glow)',
                    color: '#ffffff',
                  }}
                >
                  <Printer size={26} />
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  PrintHub Business
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.45 }}>
                  {authMode === 'signup'
                    ? 'Register your print/photocopy cafe to get your QR code'
                    : 'Sign in to manage printers, live requests, and prices'}
                </p>
              </div>

              {/* Mode Toggle Switch */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--btn-secondary-bg)',
                  borderRadius: '12px',
                  padding: '4px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '22px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: authMode === 'login' ? 'var(--accent-indigo)' : 'transparent',
                    color: authMode === 'login' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontSize: '0.88rem',
                    boxShadow: authMode === 'login' ? '0 2px 8px var(--accent-indigo-glow)' : 'none',
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: authMode === 'signup' ? 'var(--accent-indigo)' : 'transparent',
                    color: authMode === 'signup' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontSize: '0.88rem',
                    boxShadow: authMode === 'signup' ? '0 2px 8px var(--accent-indigo-glow)' : 'none',
                  }}
                >
                  Register New Cafe
                </button>
              </div>

              {authError && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: 'var(--accent-rose)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    borderRadius: '10px',
                    marginBottom: '18px',
                  }}
                >
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {authMode === 'signup' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      Shop / Cafe Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mayank Xerox & Prints"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="biz-input"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.92rem',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="cafe@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="biz-input"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Password (min 8 characters) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="biz-input"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="biz-btn-primary"
                  style={{ marginTop: '8px', padding: '14px', fontSize: '0.98rem' }}
                >
                  {isSubmitting
                    ? 'Processing...'
                    : authMode === 'signup'
                    ? 'Create Cafe & Launch'
                    : 'Sign In to Dashboard'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                {authMode === 'login' ? (
                  <span>
                    New print cafe?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError(null);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-indigo)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Register here
                    </button>
                  </span>
                ) : (
                  <span>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError(null);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-indigo)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Sign in here
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', maxHeight: '100vh' }}>
              {children}
            </main>
            <ToastStack />
          </div>
        )}
      </body>
    </html>
  );
}
