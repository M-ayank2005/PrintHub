import { create } from 'zustand';

export interface BusinessStoreState {
  business: any | null;
  pendingJobs: any[];
  toastJobs: any[];
  printers: any[];
  selectedPrinter: string | null;
  isDND: boolean;
  isConnected: boolean;

  setBusiness: (biz: any) => void;
  setConnected: (val: boolean) => void;
  setPrinters: (list: any[]) => void;
  setSelectedPrinter: (name: string) => void;
  toggleDND: () => void;
  addJob: (job: any) => void;
  updateJob: (jobId: string, status: string, paymentState?: string) => void;
  dismissToast: (jobId: string) => void;
}

export const useBusinessStore = create<BusinessStoreState>((set) => ({
  business: null,
  pendingJobs: [],
  toastJobs: [],
  printers: [
    { name: 'Microsoft Print to PDF', isOnline: true, isColor: true, isDuplex: true, paperSizes: ['A4', 'A3'] },
    { name: 'HP LaserJet Pro M404dn', isOnline: true, isColor: false, isDuplex: true, paperSizes: ['A4'] },
    { name: 'Canon imageCLASS LBP6030w', isOnline: true, isColor: false, isDuplex: false, paperSizes: ['A4'] },
  ],
  selectedPrinter: 'Microsoft Print to PDF',
  isDND: false,
  isConnected: false,

  setBusiness: (business) => set({ business }),
  setConnected: (isConnected) => set({ isConnected }),
  setPrinters: (printers) => set({ printers }),
  setSelectedPrinter: (selectedPrinter) => set({ selectedPrinter }),
  toggleDND: () => set((state) => ({ isDND: !state.isDND })),

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
