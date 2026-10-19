'use client';

import React, { useEffect, useState } from 'react';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { ToastStack } from '../components/ToastStack';
import { initBusinessSocket, disconnectSocket } from '../lib/socket';
import { useBusinessStore } from '../lib/store';
import { api, getAuthToken } from '../lib/api';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setBusiness, setConnected, addJob, updateJob, isDND } = useBusinessStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('shop@printhub.local');
  const [password, setPassword] = useState('Password123!');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsAuthenticated(true);
      fetchProfile();
      setupSocket();
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
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await api.login(email, password);
      setIsAuthenticated(true);
      fetchProfile();
      setupSocket();
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    }
  };

  if (!isAuthenticated) {
    return (
      <html lang="en">
        <body>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
            <div className="biz-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>PrintHub Business</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
                Sign in to manage printers, pricing, and live print requests.
              </p>

              {authError && (
                <div style={{ padding: '10px 12px', background: 'rgba(244, 63, 94, 0.15)', color: '#fca5a5', fontSize: '0.82rem', borderRadius: '8px', marginBottom: '16px' }}>
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>

                <button type="submit" className="biz-btn-primary" style={{ marginTop: '8px', padding: '12px' }}>
                  Sign In to Desktop Agent
                </button>
              </form>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', maxHeight: '100vh' }}>
            {children}
          </main>
          <ToastStack />
        </div>
      </body>
    </html>
  );
}
