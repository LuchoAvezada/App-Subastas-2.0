import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const value = {
    toast: addToast,
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast floating container — región live para lectores de pantalla */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-up',
              t.type === 'success' && 'bg-white border-emerald-200 text-gray-800',
              t.type === 'error' && 'bg-white border-rose-200 text-gray-800',
              t.type === 'info' && 'bg-white border-blue-200 text-gray-800'
            )}
          >
            {t.type === 'success' && (
              <CheckCircleIcon className="w-[22px] h-[22px] text-emerald-600 shrink-0 mt-0.5" />
            )}
            {t.type === 'error' && (
              <WarningCircleIcon className="w-[22px] h-[22px] text-rose-600 shrink-0 mt-0.5" />
            )}
            {t.type === 'info' && (
              <InfoIcon className="w-[22px] h-[22px] text-blue-600 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 text-sm font-medium leading-relaxed">{t.message}</div>

            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 grid place-items-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
              aria-label="Cerrar notificación"
            >
              <XIcon className="w-[18px] h-[18px]" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}
