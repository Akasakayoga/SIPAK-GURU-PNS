export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface SwalOptions {
  title: string;
  text: string;
  icon: 'success' | 'error' | 'info' | 'warning';
  confirmButtonText?: string;
}

export const toast = {
  success: (message: string) => {
    window.dispatchEvent(new CustomEvent('sipak_toast', { detail: { message, type: 'success' } }));
  },
  error: (message: string) => {
    window.dispatchEvent(new CustomEvent('sipak_toast', { detail: { message, type: 'error' } }));
  },
  info: (message: string) => {
    window.dispatchEvent(new CustomEvent('sipak_toast', { detail: { message, type: 'info' } }));
  },
  warning: (message: string) => {
    window.dispatchEvent(new CustomEvent('sipak_toast', { detail: { message, type: 'warning' } }));
  }
};

export const swal = {
  fire: (options: SwalOptions) => {
    window.dispatchEvent(new CustomEvent('sipak_swal', { detail: options }));
  }
};
