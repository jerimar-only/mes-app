"use client";

import { useEffect, useState } from "react";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [margin, setMargin] = useState(EXPANDED_WIDTH);

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
      className="min-h-screen min-w-0 transition-[margin] duration-200 ease-out"
    >
      {children}
    </div>
  );
}
