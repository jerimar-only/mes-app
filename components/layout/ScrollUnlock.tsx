"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Force document scroll back on (clears any leftover JS locks). */
export function clearScrollLock() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove("dashboard-lock");
  document.documentElement.style.overflow = "";
  document.documentElement.style.height = "";
  document.documentElement.style.position = "";
  document.documentElement.style.touchAction = "";

  document.body.style.overflow = "";
  document.body.style.height = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.touchAction = "";

  const main = document.querySelector<HTMLElement>(".app-main");
  const shell =
    document.querySelector<HTMLElement>(".app-shell") ?? main?.parentElement;

  // Desktop dashboard layout is pure CSS via :has(.dashboard-page) at lg+.
  // On mobile / non-dashboard, always strip any leftover inline height/overflow
  // so single-finger document scroll works.
  const onDashboard = Boolean(shell?.querySelector(".dashboard-page"));
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 1023px)").matches;

  if (!onDashboard || isMobile) {
    if (shell) {
      shell.style.height = "";
      shell.style.maxHeight = "";
      shell.style.overflow = "";
    }
    if (main) {
      main.style.minHeight = "";
      main.style.height = "";
      main.style.maxHeight = "";
      main.style.overflow = "";
      main.style.maxWidth = "";
      main.style.paddingLeft = "";
      main.style.paddingRight = "";
      main.style.paddingTop = "";
      main.style.paddingBottom = "";
      main.style.display = "";
      main.style.flexDirection = "";
    }
  }
}

/**
 * Clears scroll locks on every route change and when the page is shown again
 * (bfcache / tab focus). Desktop dashboard uses CSS only at lg+.
 */
export default function ScrollUnlock() {
  const pathname = usePathname();

  useEffect(() => {
    clearScrollLock();
    const raf = requestAnimationFrame(() => clearScrollLock());
    const t1 = window.setTimeout(() => clearScrollLock(), 0);
    const t2 = window.setTimeout(() => clearScrollLock(), 50);
    const t3 = window.setTimeout(() => clearScrollLock(), 200);

    // iOS / mobile: unlock after back-forward cache restore and tab focus
    const onShow = () => clearScrollLock();
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onShow);
    document.addEventListener("visibilitychange", onShow);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onShow);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [pathname]);

  return null;
}
