const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('printhub_biz_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('printhub_biz_token', token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('printhub_biz_refresh');
}

export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('printhub_biz_refresh', token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('printhub_biz_token');
  localStorage.removeItem('printhub_biz_refresh');
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function request(path: string, options: RequestInit = {}, isRetry = false): Promise<any> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (data?.tokens?.accessToken) {
              setAuthToken(data.tokens.accessToken);
              if (data.tokens.refreshToken) {
                setRefreshToken(data.tokens.refreshToken);
              }
              onRefreshed(data.tokens.accessToken);
              isRefreshing = false;
              // Retry original request
              return request(path, options, true);
            }
          }
          // Refresh failed
          onRefreshed(null);
          removeAuthToken();
        } catch (err) {
          onRefreshed(null);
          removeAuthToken();
        } finally {
          isRefreshing = false;
        }
      } else {
        // Queue request until refresh finishes
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((newToken) => {
            if (newToken) {
              resolve(request(path, options, true));
            } else {
              reject(new Error('Session expired. Please log in again.'));
            }
          });
        });
      }
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return await res.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string, deviceId?: string) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceId }),
    });
    if (data?.tokens?.accessToken) {
      setAuthToken(data.tokens.accessToken);
    }
    if (data?.tokens?.refreshToken) {
      setRefreshToken(data.tokens.refreshToken);
    }
    return data;
  },

  signup: async (email: string, password: string, shopName: string, deviceId?: string) => {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, shopName, deviceId }),
    });
    if (data?.tokens?.accessToken) {
      setAuthToken(data.tokens.accessToken);
    }
    if (data?.tokens?.refreshToken) {
      setRefreshToken(data.tokens.refreshToken);
    }
    return data;
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch (e) {
        // ignore logout errors
      }
    }
    removeAuthToken();
  },

  // Business Profile
  getProfile: () => request('/business/me'),
  updateProfile: (data: any) =>
    request('/business/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updatePricing: (data: any) =>
    request('/business/me/pricing', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  rotateSlug: () =>
    request('/business/me/slug/rotate', {
      method: 'POST',
    }),

  // Printers
  getSystemPrinters: () => request('/business/system-printers'),

  // Jobs
  getJobs: (status?: string) =>
    request(`/business/jobs${status ? `?status=${status}` : ''}`),
  acceptJob: (id: string) =>
    request(`/business/jobs/${id}/accept`, { method: 'POST' }),
  rejectJob: (id: string, reason?: string) =>
    request(`/business/jobs/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  retryJob: (id: string) =>
    request(`/business/jobs/${id}/retry`, { method: 'POST' }),
  markPaid: (id: string) =>
    request(`/business/jobs/${id}/mark-paid`, { method: 'POST' }),

  // Stats
  getStats: (days = 7) => request(`/business/stats?days=${days}`),

  // Agent Specific
  registerAgent: (data: { deviceId: string; deviceName: string; printerCaps: any[]; forceTakeover?: boolean }) =>
    request('/business/agent/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDownloadUrls: (id: string) =>
    request(`/agent/jobs/${id}/download-urls`, { method: 'POST' }),
  updateJobStatus: (id: string, status: string, reason?: string) =>
    request(`/agent/jobs/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    }),
};
