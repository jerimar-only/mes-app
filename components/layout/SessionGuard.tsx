"use client";

import { useEffect } from "react";

export default function SessionGuard() {
  useEffect(() => {
    let redirecting = false;
    const toLogin = () => {
      if (redirecting) return;
      redirecting = true;
      window.location.replace("/login");
    };

    // 1) Any /api/* call that returns 401 → go to login
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401) {
        const input = args[0];
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
            ? input.url
            : String(input);
        if (new URL(url, window.location.origin).pathname.startsWith("/api/")) {
          toLogin();
        }
      }
      return res;
    };

    // 2) Re-check when the tab regains focus, and every 2 minutes
    const check = async () => {
      try {
        const r = await originalFetch("/api/session", { cache: "no-store" });
        if (r.status === 401) toLogin();
      } catch {
        /* offline: ignore */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const id = setInterval(check, 120_000);

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      clearInterval(id);
    };
  }, []);

  return null;
}