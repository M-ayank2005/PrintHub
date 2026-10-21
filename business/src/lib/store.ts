import { create } from 'zustand';

export interface BusinessStoreState {
  business: any | null;
  pendingJobs: any[];
  toastJobs: any[];
  printers: any[];
  selectedPrinter: string | null;
  isDND: boolean;
  isConnected: boolean;
  theme: 'dark' | 'light';

  setBusiness: (biz: any) => void;
  setConnected: (val: boolean) => void;
  setPrinters: (list: any[]) => void;
  setPendingJobs: (jobs: any[]) => void;
  setSelectedPrinter: (name: string) => void;
  toggleDND: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  recentJobs: any[];
  setRecentJobs: (jobs: any[]) => void;
  addOrUpdateRecentJob: (job: any) => void;
  addJob: (job: any) => void;
  updateJob: (jobId: string, status: string, paymentState?: string) => void;
  dismissToast: (jobId: string) => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('printhub_biz_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'dark';
};

const getInitialPrinter = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('printhub_selected_printer');
  }
  return null;
};

export const useBusinessStore = create<BusinessStoreState>((set) => ({
  business: null,
  pendingJobs: [],
  toastJobs: [],
  recentJobs: [],
  printers: [],
  selectedPrinter: getInitialPrinter(),
  isDND: false,
  isConnected: false,
  theme: getInitialTheme(),

  setBusiness: (business) => set({ business }),
  setConnected: (isConnected) => set({ isConnected }),
  setPrinters: (printers) => set({ printers }),
  setPendingJobs: (pendingJobs) => set({ pendingJobs }),
  setRecentJobs: (recentJobs) => set({ recentJobs }),

  addOrUpdateRecentJob: (job) =>
    set((state) => {
      const jobId = job._id || job.id;
      const existingIndex = state.recentJobs.findIndex((j) => (j._id || j.id) === jobId);
      if (existingIndex >= 0) {
        const updated = [...state.recentJobs];
        updated[existingIndex] = { ...updated[existingIndex], ...job, _id: jobId };
        return { recentJobs: updated };
      }
      return {
        recentJobs: [{ ...job, _id: jobId }, ...state.recentJobs].slice(0, 30),
      };
    }),

  setSelectedPrinter: (selectedPrinter) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('printhub_selected_printer', selectedPrinter);
    }
    set({ selectedPrinter });
  },
  toggleDND: () => set((state) => ({ isDND: !state.isDND })),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('printhub_biz_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('printhub_biz_theme', next);
        document.documentElement.setAttribute('data-theme', next);
      }
      return { theme: next };
    }),

  addJob: (job) =>
    set((state) => {
      // Add to pending jobs and toast stack if status is SUBMITTED
      const exists = state.pendingJobs.some((j) => j.id === job.id);
      if (exists) return state;

      return {
        pendingJobs: [job, ...state.pendingJobs],
        toastJobs: [job, ...state.toastJobs.slice(0, 2)], // Max 3 stacking toasts
      };
    }),

  updateJob: (jobId, status, paymentState) =>
    set((state) => {
      const isTerminal = ['PRINTED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(status);
      const targetJob = state.pendingJobs.find((j) => j.id === jobId);

      // Also sync to recentJobs so it instantly reflects in the Dashboard
      let nextRecent = [...state.recentJobs];
      const recentIdx = nextRecent.findIndex((j) => (j._id || j.id) === jobId);
      if (recentIdx >= 0) {
        nextRecent[recentIdx] = {
          ...nextRecent[recentIdx],
          status,
          ...(paymentState && { paymentState }),
        };
      } else if (targetJob) {
        nextRecent = [
          {
            _id: jobId,
            code: targetJob.code,
            customerName: targetJob.customerName,
            totals: targetJob.totals,
            paymentMode: targetJob.paymentMode,
            paymentState: paymentState || targetJob.paymentState || 'PENDING',
            status,
            createdAt: targetJob.createdAt || new Date().toISOString(),
          },
          ...nextRecent,
        ].slice(0, 30);
      }

      return {
        pendingJobs: isTerminal
          ? state.pendingJobs.filter((j) => j.id !== jobId)
          : state.pendingJobs.map((j) =>
              j.id === jobId ? { ...j, status, ...(paymentState && { paymentState }) } : j
            ),
        toastJobs: state.toastJobs.filter((j) => j.id !== jobId),
        recentJobs: nextRecent,
      };
    }),

  dismissToast: (jobId) =>
    set((state) => ({
      toastJobs: state.toastJobs.filter((j) => j.id !== jobId),
    })),
}));
