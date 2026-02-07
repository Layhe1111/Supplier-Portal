'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastPayload = {
  id: number;
  type: ToastType;
  message: string;
  open: boolean;
};

type ToastOptions = {
  durationMs?: number;
};

type ToastContextValue = {
  show: (type: ToastType, message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION_MS = 5000;
const EXIT_ANIMATION_MS = 300;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setToast((prev) => (prev ? { ...prev, open: false } : prev));
    unmountTimerRef.current = setTimeout(() => {
      setToast(null);
    }, EXIT_ANIMATION_MS);
  }, [clearTimers]);

  const show = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const safe = message.trim();
      if (!safe) return;
      clearTimers();
      const id = Date.now();
      setToast({ id, type, message: safe, open: true });
      closeTimerRef.current = setTimeout(() => {
        setToast((prev) => (prev && prev.id === id ? { ...prev, open: false } : prev));
        unmountTimerRef.current = setTimeout(() => {
          setToast((prev) => (prev && prev.id === id ? null : prev));
        }, EXIT_ANIMATION_MS);
      }, options?.durationMs ?? DEFAULT_DURATION_MS);
    },
    [clearTimers]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
      warning: (message, options) => show('warning', message, options),
      dismiss,
    }),
    [dismiss, show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[100] w-[360px] max-w-[calc(100vw-2rem)] transform transition-all duration-300 ${
            toast.open ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
          }`}
          aria-live="polite"
        >
          <div
            className={`rounded border px-4 py-3 shadow-lg ${
              toast.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : toast.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : toast.type === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm">{toast.message}</p>
              <button
                type="button"
                onClick={dismiss}
                className="text-base leading-none opacity-70 hover:opacity-100"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
