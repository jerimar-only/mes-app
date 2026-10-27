"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Force document scroll back on (clears any leftover JS locks). */
export function clearScrollLock() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove("dashboard-lock");
  document.documentElement.style.overflow = "";
  document.documentElement.style.height = "";
  document.body.style.overflow = "";
  document.body.style.height = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";

  const main = document.querySelector<HTMLElement>(".app-main");
  const shell =
    document.querySelector<HTMLElement>(".app-shell") ?? main?.parentElement;

  // Only strip shell/main inline styles when we are NOT on the dashboard page
  // (desktop dashboard layout is pure CSS via :has(.dashboard-page)).
  const onDashboard = Boolean(shell?.querySelector(".dashboard-page"));
  if (!onDashboard) {
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
 * Clears scroll locks on every route change. Desktop dashboard uses CSS only.
 */
export default function ScrollUnlock() {
  const pathname = usePathname();

  useEffect(() => {
    clearScrollLock();
    const raf = requestAnimationFrame(() => clearScrollLock());
    const t1 = window.setTimeout(() => clearScrollLock(), 0);
    const t2 = window.setTimeout(() => clearScrollLock(), 100);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
