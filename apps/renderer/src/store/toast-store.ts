import { create } from 'zustand';

export type ToastTone = 'ok' | 'err' | 'info';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 3200;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, tone = 'ok') => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    window.setTimeout(() => {
      get().dismiss(id);
    }, AUTO_DISMISS_MS);
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
