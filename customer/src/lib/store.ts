import { create } from 'zustand';
import { DocumentOptions, DocumentKind } from '@printhub/shared';
import { Language } from './i18n';

export interface CartDocItem {
  docId: string;
  name: string;
  kind: DocumentKind;
  storageKey: string;
  sizeBytes: number;
  pages: number;
  options: DocumentOptions;
  priceSubtotalPaise?: number;
  uploadProgress?: number;
}

export interface CustomerStoreState {
  language: Language;
  shop: any | null;
  sessionToken: string | null;
  sessionId: string | null;
  docs: CartDocItem[];
  totals: {
    documents: number;
    pages: number;
    sheets: number;
    bwSheets: number;
    colorSheets: number;
    pricePaise: number;
  } | null;
  isQuoting: boolean;

  setLanguage: (lang: Language) => void;
  setShop: (shop: any) => void;
  setSession: (token: string, sessionId: string) => void;
  addDoc: (doc: CartDocItem) => void;
  removeDoc: (docId: string) => void;
  updateDocOptions: (docId: string, options: Partial<DocumentOptions>) => void;
  setTotals: (totals: any) => void;
  setQuoting: (val: boolean) => void;
  clearCart: () => void;
}

export const useCustomerStore = create<CustomerStoreState>((set) => ({
  language: 'en',
  shop: null,
  sessionToken: null,
  sessionId: null,
  docs: [],
  totals: null,
  isQuoting: false,

  setLanguage: (language) => set({ language }),
  setShop: (shop) => set({ shop }),
  setSession: (sessionToken, sessionId) => set({ sessionToken, sessionId }),

  addDoc: (doc) =>
    set((state) => ({
      docs: [...state.docs, doc],
    })),

  removeDoc: (docId) =>
    set((state) => ({
      docs: state.docs.filter((d) => d.docId !== docId),
    })),

  updateDocOptions: (docId, partialOptions) =>
    set((state) => ({
      docs: state.docs.map((d) =>
        d.docId === docId ? { ...d, options: { ...d.options, ...partialOptions } } : d
      ),
    })),

  setTotals: (totals) => set({ totals }),
  setQuoting: (isQuoting) => set({ isQuoting }),
  clearCart: () => set({ docs: [], totals: null }),
}));
