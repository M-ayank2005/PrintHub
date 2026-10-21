export async function showNativeNotification(title: string, body: string): Promise<void> {
  // 1. If running inside Tauri desktop app, use native Windows toast via Tauri invoke
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('show_desktop_notification', { title, body });
      return;
    }
  } catch (err) {
    console.warn('Tauri desktop notification failed, falling back to Web Notification:', err);
  }

  // 2. Web browser fallback
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      }
    }
  } catch (err) {
    console.warn('Web notification failed:', err);
  }
}
