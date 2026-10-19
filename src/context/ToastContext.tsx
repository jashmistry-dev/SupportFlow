import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg shadow-lg border text-xs animate-fade-in transition-all ${
                isSuccess
                  ? 'bg-white dark:bg-[#192330] border-emerald-500/40 text-[#202B3C] dark:text-[#F1F5F9]'
                  : isError
                  ? 'bg-white dark:bg-[#192330] border-red-500/40 text-red-700 dark:text-red-400'
                  : 'bg-white dark:bg-[#192330] border-[#E1E6EE] dark:border-[#344153] text-[#202B3C] dark:text-[#F1F5F9]'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-role-primary shrink-0 mt-0.5" />}

              <div className="flex-1 font-medium leading-relaxed">{toast.message}</div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-[#8B95A5] hover:text-[#202B3C] dark:text-[#6B7B92] dark:hover:text-[#F1F5F9] p-0.5 rounded transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
    };
  }
  return context;
};
