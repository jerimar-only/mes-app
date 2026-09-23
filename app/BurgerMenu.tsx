"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "./actions";

export default function BurgerMenu({
  isAdmin,
  userName,
}: {
  isAdmin: boolean;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        style={{
          background: "none",
          border: "none",
          color: "white",
          fontSize: "22px",
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        ☰
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "36px",
            left: 0,
            background: "white",
            border: "1px solid #D8D3C4",
            borderRadius: "8px",
            minWidth: "200px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 50,
          }}
        >
          <div style={{ padding: "10px 14px", fontSize: "13px", color: "#5B6156", borderBottom: "1px solid #E9E5D8" }}>
            Signed in as {userName}
          </div>

          <MenuLink href="/dashboard" onClick={() => setOpen(false)}>Dashboard</MenuLink>
          <MenuLink href="/records" onClick={() => setOpen(false)}>Records</MenuLink>
          <MenuLink href="/new" onClick={() => setOpen(false)}>Log new apprehension</MenuLink>

          {isAdmin && (
            <>
              <div style={{ borderTop: "1px solid #E9E5D8", margin: "4px 0" }} />
              <MenuLink href="/users" onClick={() => setOpen(false)}>Create user account</MenuLink>
            </>
          )}

          <div style={{ borderTop: "1px solid #E9E5D8", margin: "4px 0" }} />
          <form action={logout}>
            <button
              type="submit"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "#993C1D",
              }}
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "block",
        padding: "10px 14px",
        fontSize: "14px",
        color: "#1F2A1E",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}
