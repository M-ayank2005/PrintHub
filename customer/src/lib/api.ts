const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export function getStoredSessionToken(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`printhub_session_${slug}`);
}

export function setStoredSessionToken(slug: string, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`printhub_session_${slug}`, token);
}

export async function fetchShop(slug: string): Promise<any> {
  const res = await fetch(`${API_BASE}/public/shops/${slug}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch shop information');
  }
  const data = await res.json();
  return data.shop;
}

export async function createSession(slug: string): Promise<{ token: string; sessionId: string; shopName: string }> {
  const res = await fetch(`${API_BASE}/public/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to start session');
  }
  const data = await res.json();
  setStoredSessionToken(slug, data.token);
  return data;
}

export async function presignUpload(
  sessionToken: string,
  kind: 'PDF' | 'IMAGE' | 'SCAN',
  contentType: string,
  sizeBytes: number
): Promise<{ docId: string; uploadUrl: string; headers?: Record<string, string>; storageKey: string }> {
  const res = await fetch(`${API_BASE}/public/uploads/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken,
    },
    body: JSON.stringify({ kind, contentType, sizeBytes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to presign upload');
  }
  return await res.json();
}

export async function uploadBinary(
  uploadUrl: string,
  data: Blob | ArrayBuffer,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(data);
  });
}

export async function confirmUpload(
  sessionToken: string,
  storageKey: string,
  kind: 'PDF' | 'IMAGE' | 'SCAN'
): Promise<{ sizeBytes: number; pages: number }> {
  const res = await fetch(`${API_BASE}/public/uploads/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken,
    },
    body: JSON.stringify({ storageKey, kind }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to confirm upload');
  }
  return await res.json();
}

export async function getQuote(sessionToken: string, docs: any[]): Promise<any> {
  const res = await fetch(`${API_BASE}/public/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken,
    },
    body: JSON.stringify({ docs }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to calculate quote');
  }
  return await res.json();
}

export async function submitJob(sessionToken: string, payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/public/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit print job');
  }
  return await res.json();
}

export async function getJobStatus(sessionToken: string, jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/public/jobs/${jobId}`, {
    headers: {
      'x-session-token': sessionToken,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch job status');
  }
  const data = await res.json();
  return data.job;
}

export async function claimPayment(sessionToken: string, jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/public/jobs/${jobId}/payment-claim`, {
    method: 'POST',
    headers: {
      'x-session-token': sessionToken,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to claim payment');
  }
}

export async function cancelJob(sessionToken: string, jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/public/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: {
      'x-session-token': sessionToken,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel job');
  }
}
