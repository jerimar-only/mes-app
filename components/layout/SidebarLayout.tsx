"use client";

import { useEffect, useState } from "react";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  // Start at 0 so mobile never paints with a 260px offset (header would be off-screen).
  // Desktop margin is applied after mount.
  const [margin, setMargin] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      const isMobile = window.matchMedia("(max-width: 639px)").matches;
      if (isMobile) {
        setMargin(0);
        return;
      }
      const collapsed = localStorage.getItem("sidebar-collapsed") === "true";
      setMargin(collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
    };

    update();
    setReady(true);
    window.addEventListener("resize", update);
    window.addEventListener("sidebar-change", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("sidebar-change", update);
    };
  }, []);

  return (
    <div
      style={{ marginLeft: margin }}
      className={`app-shell min-h-dvh min-w-0 max-sm:!ml-0 ${
        ready ? "transition-[margin] duration-200 ease-out" : ""
      }`}
    >
      {children}
    </div>
  );
}
