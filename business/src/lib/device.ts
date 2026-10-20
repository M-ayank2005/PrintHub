export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  const STORAGE_KEY = 'printhub_biz_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Terminal';
  const isWindows = typeof navigator !== 'undefined' && /windows|win32|win64/i.test(navigator.userAgent || '');
  return isWindows ? 'Windows Shop Terminal' : 'PrintHub Counter Terminal';
}
