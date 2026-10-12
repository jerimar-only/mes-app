"use client";

/**
 * File: components/ui/Toast.tsx
 * Shared toast notifications — show immediately + after soft navigations.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
};

type ToastContextValue = {
  toast: (opts: {
    type?: ToastType;
    title?: string;
    message: string;
    duration?: number;
  }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  /** Persist for next route; also tries to show immediately. */
  flash: (type: ToastType, message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const FLASH_KEY = "ems-toast-flash";
const FLASH_EVENT = "ems-toast-flash";
const DEFAULT_DURATION = 5000;

type FlashPayload = { type: ToastType; message: string; title?: string };

function readFlash(): FlashPayload | null {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FLASH_KEY);
    return JSON.parse(raw) as FlashPayload;
  } catch {
    return null;
  }
}

function writeFlash(payload: FlashPayload) {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef<Map<string, number>>(new Map());
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (item: Omit<ToastItem, "id"> & { id?: string }) => {
      const id =
        item.id ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = item.duration ?? DEFAULT_DURATION;
      setItems((prev) => {
        // avoid duplicate identical messages stacked
        if (
          prev.some(
            (p) =>
              p.message === item.message &&
              p.title === item.title &&
              p.type === item.type
          )
        ) {
          return prev;
        }
        return [...prev, { ...item, id, duration }];
      });
      if (duration > 0) {
        const handle = window.setTimeout(() => dismiss(id), duration);
        timers.current.set(id, handle);
      }
    },
    [dismiss]
  );

  const consumeFlash = useCallback(() => {
    const data = readFlash();
    if (!data) return;
    // small delay so layout/portal is ready after navigation
    window.setTimeout(() => {
      push({
        type: data.type,
        message: data.message,
        title: data.title,
        duration: DEFAULT_DURATION,
      });
    }, 50);
  }, [push]);

  useEffect(() => {
    setMounted(true);
    consumeFlash();

    const onFlashEvent = () => consumeFlash();
    window.addEventListener(FLASH_EVENT, onFlashEvent);
    // bfcache / back-forward
    window.addEventListener("pageshow", onFlashEvent);

    return () => {
      window.removeEventListener(FLASH_EVENT, onFlashEvent);
      window.removeEventListener("pageshow", onFlashEvent);
      timers.current.forEach((h) => window.clearTimeout(h));
      timers.current.clear();
    };
  }, [consumeFlash]);

  // After client-side route changes, show any pending flash
  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    consumeFlash();
  }, [pathname, consumeFlash]);

  const toast = useCallback(
    ({
      type = "info",
      title,
      message,
      duration = DEFAULT_DURATION,
    }: {
      type?: ToastType;
      title?: string;
      message: string;
      duration?: number;
    }) => {
      push({ type, title, message, duration });
    },
    [push]
  );

  const flash = useCallback((type: ToastType, message: string, title?: string) => {
    writeFlash({ type, message, title });
    // Notify any mounted provider (same page) immediately
    window.dispatchEvent(new Event(FLASH_EVENT));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message, title = "Saved") =>
        toast({ type: "success", title, message }),
      error: (message, title = "Error") =>
        toast({ type: "error", title, message }),
      info: (message, title) => toast({ type: "info", title, message }),
      flash,
    }),
    [toast, flash]
  );

  const stack =
    mounted && items.length > 0 ? (
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[99999] flex flex-col items-center gap-2 px-4 sm:top-6"
        aria-live="assertive"
        aria-relevant="additions"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl ${
              item.type === "success"
                ? "border-emerald-600/40 bg-emerald-600 text-white"
                : item.type === "error"
                ? "border-red-600/40 bg-red-600 text-white"
                : "border-zinc-700 bg-zinc-900 text-white"
            }`}
          >
            <span
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-bold"
              aria-hidden
            >
              {item.type === "success" ? "✓" : item.type === "error" ? "!" : "i"}
            </span>
            <div className="min-w-0 flex-1">
              {item.title && (
                <p className="text-[13px] font-semibold leading-tight text-white">
                  {item.title}
                </p>
              )}
              <p className="text-[13.5px] leading-snug text-white/95">
                {item.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Dismiss"
            >
              <svg
                className="size-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && stack ? createPortal(stack, document.body) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}
