"use client";

import { useEffect, useState } from "react";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [margin, setMargin] = useState(256);

  useEffect(() => {
    const update = () => {
      const collapsed = localStorage.getItem("sidebar-collapsed") === "true";
      const width = Number(localStorage.getItem("sidebar-width") || 256);
      setMargin(collapsed ? 72 : width);
    };

    update();
    window.addEventListener("sidebar-change", update);
    const interval = setInterval(update, 150); // smooth while dragging

    return () => {
      window.removeEventListener("sidebar-change", update);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      style={{ marginLeft: margin }}
      className="min-h-screen transition-[margin] duration-200 sm:transition-none"
    >
      {/* On mobile we don't apply the margin */}
      <style jsx>{`
        @media (max-width: 639px) {
          div {
            margin-left: 0 !important;
          }
        }
      `}</style>
      {children}
    </div>
  );
}