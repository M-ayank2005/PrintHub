'use client';

import React, { useEffect, useState } from 'react';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { ToastStack } from '../components/ToastStack';
import { PrinterLoader } from '../components/PrinterLoader';
import { initBusinessSocket, disconnectSocket } from '../lib/socket';
import { useBusinessStore } from '../lib/store';
import { api, getAuthToken, removeAuthToken } from '../lib/api';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setBusiness, setConnected, addJob, updateJob, isDND, theme, setTheme } = useBusinessStore();
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
        .then(() => {
          setIsAuthenticated(true);
          setupSocket();
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

  const setupSocket = () => {
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
      }
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
      if (authMode === 'signup') {
        if (!shopName.trim()) {
          throw new Error('Please enter your shop or cafe name.');
        }
        await api.signup(email.trim(), password, shopName.trim());
      } else {
        await api.login(email.trim(), password);
      }
      setIsAuthenticated(true);
      await fetchProfile();
      setupSocket();
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
          <PrinterLoader
            message="Initializing workspace & checking session..."
            submessage="Connecting to Windows spooler & PrintHub gateway"
          />
        ) : !isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
            <div className="biz-card" style={{ maxWidth: '420px', width: '100%', padding: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                    fontSize: '1.5rem',
                  }}
                >
                  🖨️
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px', color: '#ffffff' }}>
                  PrintHub Business
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  {authMode === 'signup'
                    ? 'Register your print/photocopy cafe to get your QR code'
                    : 'Sign in to manage printers, live requests, and prices'}
                </p>
              </div>

              {/* Mode Toggle Switch */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  padding: '4px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: '20px',
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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: authMode === 'login' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                    color: authMode === 'login' ? '#ffffff' : '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontSize: '0.88rem',
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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: authMode === 'signup' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                    color: authMode === 'signup' ? '#ffffff' : '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontSize: '0.88rem',
                  }}
                >
                  Register New Cafe
                </button>
              </div>

              {authError && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.84rem',
                    borderRadius: '10px',
                    marginBottom: '18px',
                  }}
                >
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {authMode === 'signup' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Shop / Cafe Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mayank Xerox & Prints"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="cafe@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Password (min 8 characters) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="biz-btn-primary"
                  style={{ marginTop: '8px', padding: '12px', fontSize: '0.95rem' }}
                >
                  {isSubmitting
                    ? 'Processing...'
                    : authMode === 'signup'
                    ? 'Create Cafe & Launch Agent'
                    : 'Sign In to Desktop Agent'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.82rem', color: '#64748b' }}>
                {authMode === 'login' ? (
                  <span>
                    New print cafe?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError(null);
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#818cf8', fontWeight: 600, cursor: 'pointer' }}
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
                      style={{ background: 'transparent', border: 'none', color: '#818cf8', fontWeight: 600, cursor: 'pointer' }}
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
