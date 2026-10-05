"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { logout } from "./actions";

const TOTAL_INACTIVITY_MS = 30 * 1000; // 30 seconds total
const WARNING_THRESHOLD_MS = 10 * 1000; // show warning in the last 10 seconds

export default function InactivityLogout() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setRemaining(null);
  }, []);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ] as const;

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const left = TOTAL_INACTIVITY_MS - elapsed;

      if (left <= 0) {
        logout();
        return;
      }

      if (left <= WARNING_THRESHOLD_MS) {
        setShowWarning(true);
        setRemaining(Math.ceil(left / 1000));
      } else {
        setShowWarning(false);
        setRemaining(null);
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [resetTimer]);

  if (!showWarning || remaining === null) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Glass card */}
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
            <svg
              className="h-7 w-7 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-white">
            Session about to expire
          </h2>
          <p className="mt-2 text-[15px] text-white/70">
            You will be logged out due to inactivity in
          </p>

          {/* Countdown */}
          <div className="my-6 text-5xl font-bold tabular-nums text-amber-400">
            {remaining}
          </div>
          <p className="mb-8 text-[14px] text-white/60">seconds</p>

          {/* Stay logged in button */}
          <button
            onClick={resetTimer}
            className="w-full rounded-lg bg-white px-4 py-3 text-[15px] font-medium text-gray-900 transition hover:bg-white/90"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  );
}