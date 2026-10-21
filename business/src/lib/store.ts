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
  printers: [],
  selectedPrinter: getInitialPrinter(),
  isDND: false,
  isConnected: false,
  theme: getInitialTheme(),

  setBusiness: (business) => set({ business }),
  setConnected: (isConnected) => set({ isConnected }),
  setPrinters: (printers) => set({ printers }),
  setPendingJobs: (pendingJobs) => set({ pendingJobs }),
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
      return {
        pendingJobs: isTerminal
          ? state.pendingJobs.filter((j) => j.id !== jobId)
          : state.pendingJobs.map((j) =>
              j.id === jobId ? { ...j, status, ...(paymentState && { paymentState }) } : j
            ),
        toastJobs: state.toastJobs.filter((j) => j.id !== jobId),
      };
    }),

  dismissToast: (jobId) =>
    set((state) => ({
      toastJobs: state.toastJobs.filter((j) => j.id !== jobId),
    })),
}));
