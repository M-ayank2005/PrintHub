const API_BASE = 'http://localhost:4000';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('printhub_biz_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('printhub_biz_token', token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('printhub_biz_token');
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return await res.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.tokens.accessToken);
    return data;
  },

  signup: async (email: string, password: string, shopName: string) => {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, shopName }),
    });
    setAuthToken(data.tokens.accessToken);
    return data;
  },

  logout: () => {
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
