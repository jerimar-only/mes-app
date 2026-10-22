"use client";

/**
 * Theme control — Photoshop-style Light / Dark appearance + optional text color.
 */

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "ems-readable-theme";
const LEGACY_UI = "ems-ui-text-color";
const LEGACY_INPUT = "ems-input-text-color";

const LIGHT_TEXT = "#121514";
const DARK_TEXT = "#eef1ee";

type ThemePack = {
  text: string;
  background: string;
  card: string;
  shell: string;
  muted: string;
  border: string;
  borderStrong: string;
  inputBg: string;
};

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  if (n.length !== 6) return 0.5;
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(n.slice(0, 2), 16));
  const g = toLin(parseInt(n.slice(2, 4), 16));
  const b = toLin(parseInt(n.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(hex: string, towardWhite: boolean, amount: number): string {
  const n = hex.replace("#", "");
  if (n.length !== 6) return hex;
  const mixCh = (c: number) => {
    const target = towardWhite ? 255 : 0;
    return Math.round(c + (target - c) * amount);
  };
  const r = mixCh(parseInt(n.slice(0, 2), 16));
  const g = mixCh(parseInt(n.slice(2, 4), 16));
  const b = mixCh(parseInt(n.slice(4, 6), 16));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function buildTheme(text: string): ThemePack {
  const textIsLight = luminance(text) > 0.45;

  let background: string;
  let card: string;
  let shell: string;
  let muted: string;
  let border: string;
  let borderStrong: string;
  let inputBg: string;

  if (textIsLight) {
    background = "#0a0c0b";
    card = "#1a1e1c";
    shell = "#121514";
    inputBg = "#0f1210";
    muted = mix(text, false, 0.35);
    border = "rgba(255,255,255,0.08)";
    borderStrong = "rgba(255,255,255,0.14)";
  } else {
    background = "#e8ebe7";
    card = "#ffffff";
    shell = "#f4f6f3";
    inputBg = "#ffffff";
    muted = mix(text, true, 0.45);
    border = "rgba(18,21,20,0.08)";
    borderStrong = "rgba(18,21,20,0.14)";
  }

  let guard = 0;
  while (contrastRatio(text, card) < 4.5 && guard < 8) {
    card = mix(card, !textIsLight, 0.12);
    guard++;
  }
  guard = 0;
  while (contrastRatio(text, background) < 4.5 && guard < 8) {
    background = mix(background, !textIsLight, 0.1);
    guard++;
  }
  guard = 0;
  while (contrastRatio(text, inputBg) < 4.5 && guard < 8) {
    inputBg = mix(inputBg, !textIsLight, 0.1);
    guard++;
  }
  if (contrastRatio(muted, card) < 3) {
    muted = mix(text, textIsLight, 0.25);
  }

  return { text, background, card, shell, muted, border, borderStrong, inputBg };
}

function applyTheme(pack: ThemePack) {
  const root = document.documentElement;
  const style = root.style;
  style.setProperty("--foreground", pack.text);
  style.setProperty("--ui-text", pack.text);
  style.setProperty("--input-text", pack.text);
  style.setProperty("--background", pack.background);
  style.setProperty("--card", pack.card);
  style.setProperty("--shell", pack.shell);
  style.setProperty("--muted", pack.muted);
  style.setProperty("--border", pack.border);
  style.setProperty("--border-strong", pack.borderStrong);
  style.setProperty("--input-bg", pack.inputBg);

  const dark = luminance(pack.text) > 0.45;
  root.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}

function clearThemeOverrides() {
  const style = document.documentElement.style;
  [
    "--foreground",
    "--ui-text",
    "--input-text",
    "--background",
    "--card",
    "--shell",
    "--muted",
    "--border",
    "--border-strong",
    "--input-bg",
  ].forEach((k) => style.removeProperty(k));
}

/** Presets that work on dark surfaces (light text) */
const DARK_PRESETS = [
  { label: "Default", text: DARK_TEXT },
  { label: "White", text: "#ffffff" },
  { label: "Green", text: "#3dce7a" },
  { label: "Amber", text: "#f0b90b" },
  { label: "Sky", text: "#7dd3fc" },
  { label: "Rose", text: "#fda4af" },
];

/** Presets that work on light surfaces (dark text) */
const LIGHT_PRESETS = [
  { label: "Default", text: LIGHT_TEXT },
  { label: "Black", text: "#000000" },
  { label: "Green", text: "#145c32" },
  { label: "Brown", text: "#5c4a1a" },
  { label: "Navy", text: "#1e3f7a" },
  { label: "Maroon", text: "#7a1e2a" },
];

export default function InputTextColorPicker() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(DARK_TEXT);
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<ThemePack | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const pack = JSON.parse(raw) as ThemePack;
        const isDark = luminance(pack.text) > 0.45;
        setColor(pack.text);
        setDark(isDark);
        setPreview(pack);
        applyTheme(pack);
        return;
      }
      const legacy =
        localStorage.getItem(LEGACY_UI) || localStorage.getItem(LEGACY_INPUT);
      if (legacy && /^#[0-9A-Fa-f]{6}$/.test(legacy)) {
        const pack = buildTheme(legacy);
        setColor(legacy);
        setDark(luminance(legacy) > 0.45);
        setPreview(pack);
        applyTheme(pack);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
        return;
      }
      const stored = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = stored === "dark" || (!stored && prefersDark);
      setDark(isDark);
      const text = isDark ? DARK_TEXT : LIGHT_TEXT;
      setColor(text);
      document.documentElement.classList.toggle("dark", isDark);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(hex: string) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    const pack = buildTheme(hex);
    const isDark = luminance(hex) > 0.45;
    setColor(hex);
    setDark(isDark);
    setPreview(pack);
    applyTheme(pack);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
      localStorage.removeItem(LEGACY_UI);
      localStorage.removeItem(LEGACY_INPUT);
    } catch {
      /* ignore */
    }
  }

  /** Photoshop-style appearance: switch Light / Dark UI */
  function setAppearance(nextDark: boolean) {
    const text = nextDark ? DARK_TEXT : LIGHT_TEXT;
    setDark(nextDark);
    commit(text);
  }

  function reset() {
    clearThemeOverrides();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_UI);
      localStorage.removeItem(LEGACY_INPUT);
    } catch {
      /* ignore */
    }
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? DARK_TEXT : LIGHT_TEXT;
    setColor(next);
    setDark(isDark);
    setPreview(null);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--card)] text-[var(--foreground)]"
        aria-label="Theme"
      >
        <span className="size-3 rounded-full bg-[var(--muted)]" />
      </button>
    );
  }

  const pack = preview || buildTheme(color);
  const presets = dark ? DARK_PRESETS : LIGHT_PRESETS;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Theme and appearance"
        title="Appearance"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--shell)]"
      >
        {dark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Theme"
          className="absolute right-0 top-full z-[100] mt-1.5 w-[19.5rem] overflow-hidden rounded-xl border shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
          style={{
            background: pack.card,
            color: pack.text,
            borderColor: pack.borderStrong,
          }}
        >
          <div
            className="flex items-center justify-between gap-2 border-b px-3.5 py-2.5"
            style={{ borderColor: pack.border }}
          >
            <p className="text-[13px] font-semibold tracking-tight">Appearance</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-6 shrink-0 items-center justify-center rounded-md transition hover:bg-black/8 dark:hover:bg-white/10"
              style={{ color: pack.muted }}
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="space-y-3.5 px-3.5 py-3">
            {/* Photoshop-style Light | Dark */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium" style={{ color: pack.muted }}>
                Color theme
              </p>
              <div
                className="grid grid-cols-2 gap-0.5 rounded-lg border p-0.5"
                style={{ borderColor: pack.borderStrong, background: pack.background }}
                role="group"
                aria-label="Light or dark mode"
              >
                <button
                  type="button"
                  onClick={() => setAppearance(false)}
                  className="flex items-center justify-center gap-1.5 rounded-md py-2 text-[12px] font-medium transition"
                  style={
                    !dark
                      ? {
                          background: pack.card,
                          color: pack.text,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                        }
                      : { color: pack.muted }
                  }
                  aria-pressed={!dark}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setAppearance(true)}
                  className="flex items-center justify-center gap-1.5 rounded-md py-2 text-[12px] font-medium transition"
                  style={
                    dark
                      ? {
                          background: pack.card,
                          color: pack.text,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                        }
                      : { color: pack.muted }
                  }
                  aria-pressed={dark}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  Dark
                </button>
              </div>
            </div>

            {/* Text / accent color for current mode */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium" style={{ color: pack.muted }}>
                Text color
              </p>
              <div className="flex items-center gap-2">
                <label
                  className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border"
                  style={{ borderColor: pack.borderStrong }}
                >
                  <span className="absolute inset-0" style={{ backgroundColor: color }} />
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : DARK_TEXT}
                    onChange={(e) => commit(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Pick text color"
                  />
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setColor(v);
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) commit(v);
                  }}
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-md border px-2.5 py-2 font-mono text-[12px] outline-none focus:border-[var(--accent)]"
                  style={{
                    background: pack.inputBg,
                    color: pack.text,
                    borderColor: pack.borderStrong,
                  }}
                  placeholder={dark ? DARK_TEXT : LIGHT_TEXT}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map((p) => {
                  const active = p.text.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={p.label + p.text}
                      type="button"
                      title={p.label}
                      onClick={() => commit(p.text)}
                      className="relative size-7 rounded-full border transition"
                      style={{
                        backgroundColor: p.text,
                        borderColor: active ? "var(--accent)" : pack.borderStrong,
                        boxShadow: active
                          ? "0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)"
                          : undefined,
                      }}
                    >
                      <span className="sr-only">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="border-t px-3.5 py-2" style={{ borderColor: pack.border }}>
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-md py-1.5 text-[11px] font-medium transition hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: pack.muted }}
            >
              Reset to system default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
