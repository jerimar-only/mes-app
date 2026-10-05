"use client";

import { useEffect, useState } from "react";

const COLLAPSED_WIDTH = 72;

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [margin, setMargin] = useState(256);

  useEffect(() => {
    const update = () => {
      const isMobile = window.matchMedia("(max-width: 639px)").matches;
      const collapsed = localStorage.getItem("sidebar-collapsed") === "true";
      const width = Number(localStorage.getItem("sidebar-width") || 256);

      // Mobile: the drawer overlays the page, so no margin
      setMargin(isMobile ? 0 : collapsed ? COLLAPSED_WIDTH : width);
    };

    update();
    window.addEventListener("sidebar-change", update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("sidebar-change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      style={{ marginLeft: margin }}
      className="min-h-screen min-w-0 transition-[margin] duration-200"
    >
      {children}
    </div>
  );
}